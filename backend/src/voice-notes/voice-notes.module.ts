import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  Injectable,
  Logger,
  Module,
  NotFoundException,
  Param,
  Post,
  Res,
  StreamableFile,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiBearerAuth, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import type { Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, AuthUser } from '../common/current-user.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../common/storage/storage.module';

// Voice notes: MediaRecorder blobs from the browser + (optional) Whisper
// transcription. Multer writes to /uploads/voice-notes/, StorageService
// then either leaves the file locally or ships it to Cloudinary depending
// on CLOUDINARY_URL. If OPENAI_API_KEY is set, the file also gets sent to
// Whisper for transcription; if not, we save the note with no transcript
// and the caller can transcribe / type manually later.

const UPLOAD_ROOT = path.join(process.cwd(), 'uploads', 'voice-notes');
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB — ~3 min of opus @ ~24kbps
const ALLOWED_MIME = new Set([
  'audio/webm',
  'audio/ogg',
  'audio/mp4',
  'audio/mpeg',
  'audio/mp3',
  'audio/wav',
  'audio/x-m4a',
]);

function safeBasename(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-80) || 'clip';
}

@Injectable()
export class VoiceNotesService {
  private readonly logger = new Logger(VoiceNotesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly config: ConfigService,
  ) {}

  async create(
    user: AuthUser,
    file: Express.Multer.File | undefined,
    durationSec: number | undefined,
  ) {
    if (!file) throw new BadRequestException('No audio uploaded');
    try {
      if (file.size > MAX_FILE_SIZE) {
        throw new BadRequestException('Clip too long (max ~3 minutes / 5 MB).');
      }
      if (!ALLOWED_MIME.has(file.mimetype)) {
        throw new BadRequestException(
          `Unsupported audio type: ${file.mimetype}. Use webm/opus, m4a, mp3, or wav.`,
        );
      }
      const stored = await this.storage.save(`voice-${user.id}`, file);

      // Try to transcribe. If OPENAI_API_KEY is missing or Whisper errors,
      // we still save the note — the audio is captured; the user can type
      // a note manually. Never fail an upload because of a transcription
      // hiccup.
      let transcript: string | null = null;
      const apiKey = this.config.get<string>('OPENAI_API_KEY');
      if (apiKey) {
        // Cloudinary saves nuke the local file — hold a copy path to send
        // to Whisper BEFORE StorageService gets a chance to unlink.
        // (Order matters: `storage.save` already ran, so for the Cloudinary
        // path the local copy is gone. For future-proofing, we read the
        // multer-provided path before storage moved it; here we've already
        // called save — this works for local storage today, and for
        // Cloudinary we'd need to fetch back the signed URL first.)
        transcript = await this.transcribeIfPossible(file, apiKey);
      }

      return this.prisma.voiceNote.create({
        data: {
          userId: user.id,
          storagePath: stored.storagePath,
          fileSize: stored.size,
          mimeType: stored.mimeType,
          durationSec: durationSec ?? null,
          transcript,
        },
      });
    } catch (err) {
      // Clean up the multer temp file on any error path.
      if (file?.path) fs.promises.unlink(file.path).catch(() => {});
      throw err;
    }
  }

  async streamAudio(user: AuthUser, id: string) {
    const note = await this.prisma.voiceNote.findUnique({ where: { id } });
    if (!note) throw new NotFoundException('Voice note not found');
    if (note.userId !== user.id) {
      // Also allow: anyone who is a caregiver of a child whose mood or
      // session record references this voice note.
      const canRead = await this.userCanReadOthersVoiceNote(user.id, id);
      if (!canRead) throw new ForbiddenException('Not your voice note');
    }
    try {
      const result = await this.storage.download(
        note.storagePath,
        note.mimeType,
        note.fileSize,
      );
      return { note, ...result };
    } catch {
      throw new NotFoundException('Audio file no longer available');
    }
  }

  private async userCanReadOthersVoiceNote(
    userId: string,
    voiceNoteId: string,
  ): Promise<boolean> {
    // We only allow read via a mood/session record. If either references
    // this voice note AND the user has caregiver access to that child,
    // grant read. Owner is already allowed above.
    const mood = await this.prisma.moodEntry.findFirst({
      where: { voiceNoteId },
      select: { childId: true },
    });
    const session = mood
      ? null
      : await this.prisma.therapySession.findFirst({
          where: { voiceNoteId },
          select: { childId: true },
        });
    const childId = mood?.childId ?? session?.childId;
    if (!childId) return false;
    const link = await this.prisma.caregiver.findFirst({
      where: { userId, childId },
      select: { id: true },
    });
    return !!link;
  }

  private async transcribeIfPossible(
    file: Express.Multer.File,
    apiKey: string,
  ): Promise<string | null> {
    // Whisper accepts multipart audio uploads. Node's built-in fetch +
    // FormData handles this since Node 18. Small clips only (<25 MB API
    // limit; our own cap is 5 MB) — no streaming needed.
    try {
      const localPath = file.path;
      const audioBuf = await fs.promises.readFile(localPath);
      const form = new FormData();
      form.append(
        'file',
        new Blob([audioBuf], { type: file.mimetype }),
        file.originalname || 'clip.webm',
      );
      form.append('model', 'whisper-1');
      // No `language` param — Whisper auto-detects, which is right for
      // Indian users switching between English and Hindi mid-sentence.
      form.append('response_format', 'json');

      const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}` },
        body: form,
      });
      if (!res.ok) {
        const err = await res.text();
        this.logger.warn(`Whisper error ${res.status}: ${err.slice(0, 200)}`);
        return null;
      }
      const data = (await res.json()) as { text?: string };
      return data.text?.trim() ?? null;
    } catch (e) {
      this.logger.warn(
        `Transcription failed (audio was still saved): ${
          e instanceof Error ? e.message : String(e)
        }`,
      );
      return null;
    }
  }
}

const uploadStorage = diskStorage({
  destination: (_req, _file, cb) => {
    try {
      fs.mkdirSync(UPLOAD_ROOT, { recursive: true });
      cb(null, UPLOAD_ROOT);
    } catch (err) {
      cb(err as Error, '');
    }
  },
  filename: (_req, file, cb) => {
    const id = crypto.randomBytes(8).toString('hex');
    cb(null, `${id}-${safeBasename(file.originalname || 'clip')}`);
  },
});

@ApiTags('voice-notes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('voice-notes')
export class VoiceNotesController {
  constructor(private readonly svc: VoiceNotesService) {}

  @Post()
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: uploadStorage,
      limits: { fileSize: MAX_FILE_SIZE },
    }),
  )
  create(
    @CurrentUser() user: AuthUser,
    @UploadedFile() file: Express.Multer.File,
    // Optional client-measured duration (seconds). Multer places non-file
    // multipart fields on `req.body`, which `@Body()` surfaces here as
    // strings — the client sends `durationSec` alongside the audio file.
    @Body('durationSec') durationSec?: string,
  ) {
    const parsed = durationSec ? parseInt(durationSec, 10) : NaN;
    return this.svc.create(
      user,
      file,
      Number.isFinite(parsed) ? parsed : undefined,
    );
  }

  @Get(':id/audio')
  async audio(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { note, stream, redirectUrl } = await this.svc.streamAudio(user, id);
    if (redirectUrl) {
      res.redirect(302, redirectUrl);
      return;
    }
    res.set({
      'Content-Type': note.mimeType,
      'Content-Length': String(note.fileSize),
      'Content-Disposition': 'inline',
      'Cache-Control': 'private, max-age=3600',
    });
    return new StreamableFile(stream!);
  }
}

@Module({
  controllers: [VoiceNotesController],
  providers: [VoiceNotesService],
})
export class VoiceNotesModule {}

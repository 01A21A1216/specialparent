import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Injectable,
  Module,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
  Res,
  StreamableFile,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiBearerAuth, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import type { Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { IsDateString, IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { FamilyDocumentType } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, AuthUser } from '../common/current-user.decorator';
import { ChildAccess } from '../common/child-access';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../common/storage/storage.module';

// Family documents vault: UDID card, Niramaya card, disability certificate,
// medical letters, school reports, IEP snapshots. Rides on the same
// StorageService as diagnostic reports so it inherits Cloudinary switchover
// for free. Access rules:
//   • The owner can always read/write their own documents.
//   • Any caregiver of the linked child can also read a child-scoped doc.
//   • Non-caregivers see 404, not 403 (avoids doc-existence enumeration).

const UPLOAD_ROOT = path.join(process.cwd(), 'uploads', 'documents');
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const ALLOWED_MIME = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
]);

function safeBasename(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-80) || 'file';
}

// ─── DTOs ─────────────────────────────────────────────────
export class CreateDocumentDto {
  @IsEnum(FamilyDocumentType) type!: FamilyDocumentType;
  @IsString() @MaxLength(200) title!: string;
  @IsOptional() @IsString() @MaxLength(2000) notes?: string;
  @IsOptional() @IsString() childId?: string;
  @IsOptional() @IsDateString() expiresAt?: string;
}

export class UpdateDocumentDto {
  @IsOptional() @IsEnum(FamilyDocumentType) type?: FamilyDocumentType;
  @IsOptional() @IsString() @MaxLength(200) title?: string;
  @IsOptional() @IsString() @MaxLength(2000) notes?: string;
  @IsOptional() @IsString() childId?: string | null;
  @IsOptional() @IsDateString() expiresAt?: string | null;
}

// ─── Service ──────────────────────────────────────────────
@Injectable()
export class DocumentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: ChildAccess,
    private readonly storage: StorageService,
  ) {}

  /**
   * List the user's own documents, plus every child-scoped document they can
   * see as a caregiver. Filters:
   *   • ?type=UDID
   *   • ?childId=xxx
   *   • ?expiring=90 → only docs whose expiresAt is within the next N days
   */
  async list(
    user: AuthUser,
    filters: { type?: FamilyDocumentType; childId?: string; expiringDays?: number },
  ) {
    // Every child the user has access to. Used to compute the set of
    // child-scoped docs they may read.
    const cgLinks = await this.prisma.caregiver.findMany({
      where: { userId: user.id },
      select: { childId: true },
    });
    const myChildIds = cgLinks.map((c) => c.childId);

    const where: import('@prisma/client').Prisma.FamilyDocumentWhereInput = {
      OR: [
        { ownerId: user.id },
        ...(myChildIds.length ? [{ childId: { in: myChildIds } }] : []),
      ],
    };
    if (filters.type) where.type = filters.type;
    if (filters.childId) where.childId = filters.childId;
    if (filters.expiringDays !== undefined) {
      const until = new Date(Date.now() + filters.expiringDays * 24 * 60 * 60 * 1000);
      where.expiresAt = { lte: until, gt: new Date() };
    }

    return this.prisma.familyDocument.findMany({
      where,
      orderBy: [{ expiresAt: 'asc' }, { createdAt: 'desc' }],
      include: {
        child: { select: { id: true, fullName: true } },
        owner: { select: { id: true, fullName: true } },
      },
    });
  }

  async create(
    user: AuthUser,
    file: Express.Multer.File | undefined,
    dto: CreateDocumentDto,
  ) {
    if (!file) throw new BadRequestException('No file uploaded');
    try {
      if (file.size > MAX_FILE_SIZE) {
        throw new BadRequestException('File too large (max 10 MB).');
      }
      if (!ALLOWED_MIME.has(file.mimetype)) {
        throw new BadRequestException('Unsupported file type. PDF / JPG / PNG / WebP / HEIC only.');
      }
      // If linked to a child, the caller must be a caregiver of that child.
      if (dto.childId) {
        await this.access.assertCaregiver(user.id, user.role, dto.childId);
      }
      // Storage layer expects a subdirectory key — reuse "docs/<userId>".
      const stored = await this.storage.save(`docs-${user.id}`, file);
      return await this.prisma.familyDocument.create({
        data: {
          ownerId: user.id,
          childId: dto.childId ?? null,
          type: dto.type,
          title: dto.title,
          notes: dto.notes,
          fileName: file.originalname,
          filePath: stored.storagePath,
          fileSize: stored.size,
          mimeType: stored.mimeType,
          expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
        },
        include: { child: { select: { id: true, fullName: true } } },
      });
    } catch (err) {
      // If we wrote to multer temp storage but the DB insert failed, clean up.
      if (file?.path) fs.promises.unlink(file.path).catch(() => {});
      throw err;
    }
  }

  async update(user: AuthUser, id: string, dto: UpdateDocumentDto) {
    const doc = await this.getOrDeny(user, id, /*writer*/ true);
    if (dto.childId !== undefined && dto.childId !== null) {
      await this.access.assertCaregiver(user.id, user.role, dto.childId);
    }
    return this.prisma.familyDocument.update({
      where: { id: doc.id },
      data: {
        type: dto.type,
        title: dto.title,
        notes: dto.notes,
        childId: dto.childId === null ? null : dto.childId,
        expiresAt:
          dto.expiresAt === null
            ? null
            : dto.expiresAt !== undefined
              ? new Date(dto.expiresAt)
              : undefined,
      },
    });
  }

  async download(user: AuthUser, id: string) {
    const doc = await this.getOrDeny(user, id, /*writer*/ false);
    try {
      const result = await this.storage.download(
        doc.filePath,
        doc.mimeType,
        doc.fileSize,
      );
      return { doc, ...result };
    } catch {
      throw new NotFoundException('File not available');
    }
  }

  async remove(user: AuthUser, id: string) {
    const doc = await this.getOrDeny(user, id, /*writer*/ true);
    await this.prisma.familyDocument.delete({ where: { id: doc.id } });
    // Best-effort file cleanup.
    this.storage.delete(doc.filePath).catch(() => {});
    return { ok: true };
  }

  /**
   * Fetch a doc and enforce access. `writer=true` restricts to the owner
   * only (renaming or deleting someone else's doc is not allowed even if
   * you can see it as a co-caregiver). `writer=false` allows caregivers
   * of the linked child.
   */
  private async getOrDeny(user: AuthUser, id: string, writer: boolean) {
    const doc = await this.prisma.familyDocument.findUnique({ where: { id } });
    if (!doc) throw new NotFoundException('Document not found');
    if (doc.ownerId === user.id) return doc;
    if (writer) throw new ForbiddenException('Only the owner can modify this document.');
    if (doc.childId) {
      try {
        await this.access.assertCaregiver(user.id, user.role, doc.childId);
        return doc;
      } catch {
        // fall through to 404
      }
    }
    throw new NotFoundException('Document not found');
  }
}

// ─── Controller ───────────────────────────────────────────
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
    cb(null, `${id}-${safeBasename(file.originalname)}`);
  },
});

@ApiTags('documents')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('documents')
export class DocumentsController {
  constructor(private readonly svc: DocumentsService) {}

  @Get()
  list(
    @CurrentUser() user: AuthUser,
    @Query('type') type?: FamilyDocumentType,
    @Query('childId') childId?: string,
    @Query('expiring') expiring?: string,
  ) {
    const expiringDays = expiring ? parseInt(expiring, 10) : undefined;
    return this.svc.list(user, {
      type,
      childId,
      expiringDays: Number.isFinite(expiringDays) ? expiringDays : undefined,
    });
  }

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
    @Body() dto: CreateDocumentDto,
  ) {
    return this.svc.create(user, file, dto);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateDocumentDto,
  ) {
    return this.svc.update(user, id, dto);
  }

  @Get(':id/download')
  async download(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { doc, stream, redirectUrl } = await this.svc.download(user, id);
    if (redirectUrl) {
      res.redirect(302, redirectUrl);
      return;
    }
    const asciiName = doc.fileName.replace(/[^\x20-\x7E]/g, '_');
    res.set({
      'Content-Type': doc.mimeType,
      'Content-Disposition': `inline; filename="${asciiName}"; filename*=UTF-8''${encodeURIComponent(doc.fileName)}`,
      'Content-Length': String(doc.fileSize),
    });
    return new StreamableFile(stream!);
  }

  @Delete(':id')
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.svc.remove(user, id);
  }
}

@Module({
  controllers: [DocumentsController],
  providers: [DocumentsService, ChildAccess],
})
export class DocumentsModule {}

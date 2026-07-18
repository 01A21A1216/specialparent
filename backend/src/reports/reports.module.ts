import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Injectable,
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
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { Response } from 'express';
import { IsOptional, IsString, MaxLength } from 'class-validator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, AuthUser } from '../common/current-user.decorator';
import { ChildAccess } from '../common/child-access';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../common/storage/storage.module';

// Multer still writes uploads here first. StorageService then either leaves
// them in place (local mode) or uploads to Cloudinary and cleans up (cloud mode).
const UPLOAD_ROOT = path.join(process.cwd(), 'uploads', 'reports');
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const ALLOWED_MIME = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
]);

// Strip anything that's not alphanumeric, dot, underscore, dash. Keep the tail
// so file extensions survive.
function safeBasename(name: string): string {
  const cleaned = name.replace(/[^a-zA-Z0-9._-]/g, '_');
  return cleaned.slice(-80) || 'file';
}

export class CreateReportDto {
  @IsString()
  @MaxLength(200)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;
}

@Injectable()
export class ReportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: ChildAccess,
    private readonly storage: StorageService,
  ) {}

  async list(user: AuthUser, childId: string) {
    await this.access.assertCaregiver(user.id, user.role, childId);
    return this.prisma.diagnosticReport.findMany({
      where: { childId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(
    user: AuthUser,
    childId: string,
    file: Express.Multer.File | undefined,
    dto: CreateReportDto,
  ) {
    if (!file) throw new BadRequestException('No file uploaded');
    // Any failure past this point must clean up the file multer already wrote.
    try {
      await this.access.assertCaregiver(user.id, user.role, childId);
      if (file.size > MAX_FILE_SIZE) {
        throw new BadRequestException('File too large (max 10 MB)');
      }
      if (!ALLOWED_MIME.has(file.mimetype)) {
        throw new BadRequestException(
          `Unsupported file type. Allowed: PDF, JPG, PNG, WebP.`,
        );
      }
      const stored = await this.storage.save(childId, file);
      // Snapshot uploader name from the user record so the report keeps
      // attribution even if the user is later deleted or renamed.
      const uploader = await this.prisma.user.findUnique({
        where: { id: user.id },
        select: { fullName: true },
      });
      return await this.prisma.diagnosticReport.create({
        data: {
          childId,
          title: dto.title,
          description: dto.description,
          fileName: file.originalname,
          filePath: stored.storagePath,
          fileSize: stored.size,
          mimeType: stored.mimeType,
          uploadedById: user.id,
          uploadedByName: uploader?.fullName ?? user.email,
        },
      });
    } catch (err) {
      fs.promises.unlink(file.path).catch(() => {});
      throw err;
    }
  }

  async findForDownload(user: AuthUser, id: string) {
    const report = await this.prisma.diagnosticReport.findUnique({
      where: { id },
    });
    if (!report) throw new NotFoundException('Report not found');
    await this.access.assertCaregiver(user.id, user.role, report.childId);
    try {
      const result = await this.storage.download(
        report.filePath,
        report.mimeType,
        report.fileSize,
      );
      return { report, ...result };
    } catch {
      throw new NotFoundException('File not available');
    }
  }

  async remove(user: AuthUser, id: string) {
    const report = await this.prisma.diagnosticReport.findUnique({
      where: { id },
    });
    if (!report) return { ok: true };
    await this.access.assertCaregiver(user.id, user.role, report.childId);
    await this.prisma.diagnosticReport.delete({ where: { id } });
    // Best-effort file cleanup.
    this.storage.delete(report.filePath).catch(() => {});
    return { ok: true };
  }
}

const uploadStorage = diskStorage({
  destination: (req, _file, cb) => {
    // Express typing: req.params values are string | string[]; take the string form.
    const raw = req.params?.childId;
    const childId = Array.isArray(raw) ? raw[0] : raw;
    // Cuid characters only — blocks path traversal via childId.
    if (!childId || !/^[a-z0-9]+$/i.test(childId)) {
      return cb(new BadRequestException('Invalid child id'), '');
    }
    const dir = path.join(UPLOAD_ROOT, childId);
    try {
      fs.mkdirSync(dir, { recursive: true });
      cb(null, dir);
    } catch (err) {
      cb(err as Error, '');
    }
  },
  filename: (_req, file, cb) => {
    const id = crypto.randomBytes(8).toString('hex');
    cb(null, `${id}-${safeBasename(file.originalname)}`);
  },
});

@ApiTags('reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class ReportsController {
  constructor(private readonly svc: ReportsService) {}

  @Get('children/:childId/reports')
  list(@CurrentUser() user: AuthUser, @Param('childId') childId: string) {
    return this.svc.list(user, childId);
  }

  @Post('children/:childId/reports')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: uploadStorage,
      limits: { fileSize: MAX_FILE_SIZE },
    }),
  )
  create(
    @CurrentUser() user: AuthUser,
    @Param('childId') childId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: CreateReportDto,
  ) {
    return this.svc.create(user, childId, file, dto);
  }

  @Get('reports/:id/download')
  async download(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { report, stream, redirectUrl } = await this.svc.findForDownload(
      user,
      id,
    );

    if (redirectUrl) {
      // Cloudinary path: 302 to the signed URL (5-min expiry). Browser follows
      // the redirect and gets the file directly from Cloudinary.
      res.redirect(302, redirectUrl);
      return;
    }

    // Local path: stream the file.
    const asciiName = report.fileName.replace(/[^\x20-\x7E]/g, '_');
    res.set({
      'Content-Type': report.mimeType,
      'Content-Disposition': `inline; filename="${asciiName}"; filename*=UTF-8''${encodeURIComponent(report.fileName)}`,
      'Content-Length': String(report.fileSize),
    });
    return new StreamableFile(stream!);
  }

  @Delete('reports/:id')
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.svc.remove(user, id);
  }
}

@Module({
  controllers: [ReportsController],
  providers: [ReportsService, ChildAccess],
})
export class ReportsModule {}

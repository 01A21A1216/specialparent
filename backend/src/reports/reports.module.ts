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
      const relPath = path
        .relative(path.join(process.cwd(), 'uploads'), file.path)
        .replace(/\\/g, '/');
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
          filePath: relPath,
          fileSize: file.size,
          mimeType: file.mimetype,
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
    const abs = path.join(process.cwd(), 'uploads', report.filePath);
    if (!fs.existsSync(abs)) {
      throw new NotFoundException('File missing on disk');
    }
    return { report, absolutePath: abs };
  }

  async remove(user: AuthUser, id: string) {
    const report = await this.prisma.diagnosticReport.findUnique({
      where: { id },
    });
    if (!report) return { ok: true };
    await this.access.assertCaregiver(user.id, user.role, report.childId);
    const abs = path.join(process.cwd(), 'uploads', report.filePath);
    await this.prisma.diagnosticReport.delete({ where: { id } });
    fs.promises.unlink(abs).catch(() => {}); // best-effort
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
    const { report, absolutePath } = await this.svc.findForDownload(user, id);
    // Filename with fallback ASCII + RFC 5987 UTF-8 form so non-latin names survive.
    const asciiName = report.fileName.replace(/[^\x20-\x7E]/g, '_');
    res.set({
      'Content-Type': report.mimeType,
      'Content-Disposition': `inline; filename="${asciiName}"; filename*=UTF-8''${encodeURIComponent(report.fileName)}`,
      'Content-Length': String(report.fileSize),
    });
    return new StreamableFile(fs.createReadStream(absolutePath));
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

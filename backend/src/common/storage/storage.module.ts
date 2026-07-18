import {
  Global,
  Injectable,
  Logger,
  Module,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';

export interface StoredFile {
  // Opaque identifier used later for download + delete.
  // Local files:   "reports/<childId>/<name>"        (relative to backend/uploads/)
  // Cloudinary:    "cloudinary:<public_id>"
  storagePath: string;
  size: number;
  mimeType: string;
}

export interface DownloadResult {
  // Exactly one of stream or redirectUrl will be set.
  stream?: fs.ReadStream;
  redirectUrl?: string;
  size?: number;
  mimeType: string;
}

const CLOUDINARY_PREFIX = 'cloudinary:';

/**
 * Feature-flagged file storage.
 * - No CLOUDINARY_URL env var  → uses backend/uploads/ on local disk
 * - CLOUDINARY_URL env var set → uploads to Cloudinary (authenticated / raw),
 *   returns signed URLs for download that expire after 5 minutes.
 *
 * multer's diskStorage still writes the incoming file locally first; when
 * Cloudinary is on we upload that file then delete the local copy.
 */
@Injectable()
export class StorageService implements OnModuleInit {
  private readonly logger = new Logger(StorageService.name);
  private useCloudinary = false;

  constructor(private readonly config: ConfigService) {}

  onModuleInit() {
    if (this.config.get<string>('CLOUDINARY_URL')) {
      // The SDK auto-reads CLOUDINARY_URL from process.env; this call just
      // ensures secure (https) delivery URLs.
      cloudinary.config({ secure: true });
      this.useCloudinary = true;
      this.logger.log('Storage: Cloudinary (env CLOUDINARY_URL detected)');
    } else {
      this.logger.log(
        'Storage: local disk (backend/uploads/). Set CLOUDINARY_URL to switch.',
      );
    }
  }

  async save(childId: string, file: Express.Multer.File): Promise<StoredFile> {
    return this.useCloudinary
      ? this.saveToCloudinary(childId, file)
      : this.saveLocally(file);
  }

  async delete(storagePath: string): Promise<void> {
    if (storagePath.startsWith(CLOUDINARY_PREFIX)) {
      const publicId = storagePath.slice(CLOUDINARY_PREFIX.length);
      try {
        await cloudinary.uploader.destroy(publicId, {
          resource_type: 'raw',
          type: 'authenticated',
        });
      } catch (err) {
        // Best-effort — DB record removal is more important than the file.
        this.logger.warn(
          `Cloudinary destroy failed for ${publicId}: ${
            err instanceof Error ? err.message : String(err)
          }`,
        );
      }
      return;
    }
    const abs = path.join(process.cwd(), 'uploads', storagePath);
    await fs.promises.unlink(abs).catch(() => {});
  }

  async download(
    storagePath: string,
    mimeType: string,
    size?: number,
  ): Promise<DownloadResult> {
    if (storagePath.startsWith(CLOUDINARY_PREFIX)) {
      const publicId = storagePath.slice(CLOUDINARY_PREFIX.length);
      const redirectUrl = cloudinary.utils.private_download_url(
        publicId,
        undefined as unknown as string, // format arg is required by types but Cloudinary lets it be undefined for raw
        {
          resource_type: 'raw',
          type: 'authenticated',
          // 5-minute expiry — enough for the browser to follow the redirect
          // but short enough that a leaked URL isn't a long-lived breach.
          expires_at: Math.floor(Date.now() / 1000) + 300,
        },
      );
      return { redirectUrl, mimeType, size };
    }
    const abs = path.join(process.cwd(), 'uploads', storagePath);
    if (!fs.existsSync(abs)) {
      throw new Error('File missing on disk');
    }
    return { stream: fs.createReadStream(abs), mimeType, size };
  }

  private async saveLocally(file: Express.Multer.File): Promise<StoredFile> {
    // multer already wrote the file to backend/uploads/reports/<childId>/... —
    // we just record its relative path.
    const relPath = path
      .relative(path.join(process.cwd(), 'uploads'), file.path)
      .replace(/\\/g, '/');
    return {
      storagePath: relPath,
      size: file.size,
      mimeType: file.mimetype,
    };
  }

  private async saveToCloudinary(
    childId: string,
    file: Express.Multer.File,
  ): Promise<StoredFile> {
    const id = crypto.randomBytes(8).toString('hex');
    const safeName = file.originalname
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .slice(-80);
    const publicId = `specialparent/reports/${childId}/${id}-${safeName}`;
    try {
      const uploaded: UploadApiResponse = await cloudinary.uploader.upload(
        file.path,
        {
          resource_type: 'raw',
          type: 'authenticated',
          public_id: publicId,
          use_filename: false,
          unique_filename: false,
        },
      );
      // Cloudinary now has the file; drop the multer-written local copy.
      await fs.promises.unlink(file.path).catch(() => {});
      return {
        storagePath: `${CLOUDINARY_PREFIX}${uploaded.public_id}`,
        size: file.size,
        mimeType: file.mimetype,
      };
    } catch (err) {
      // Leave the local copy intact for retry.
      throw new Error(
        `Cloudinary upload failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }
}

@Global()
@Module({
  providers: [StorageService],
  exports: [StorageService],
})
export class StorageModule {}

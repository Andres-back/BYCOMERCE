import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'node:crypto';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
const MAX_FILE_SIZE = 15 * 1024 * 1024;
const EXTENSIONS_BY_MIME: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'application/pdf': 'pdf',
};

@Injectable()
export class UploadsService {
  private readonly s3: S3Client;
  private readonly bucket: string;
  private readonly logger = new Logger(UploadsService.name);

  constructor(private readonly config: ConfigService) {
    const endpoint = this.config.get<string>('MINIO_ENDPOINT') ?? 'localhost';
    const port = this.config.get<string>('MINIO_PORT') ?? '9000';

    this.s3 = new S3Client({
      region: 'us-east-1',
      endpoint: `http://${endpoint}:${port}`,
      forcePathStyle: true,
      credentials: {
        accessKeyId: this.config.get<string>('MINIO_ACCESS_KEY') ?? 'mocoa_minio',
        secretAccessKey: this.config.get<string>('MINIO_SECRET_KEY') ?? 'change_me_minio',
      },
    });

    this.bucket = this.config.get<string>('MINIO_BUCKET') ?? 'mocoa-market';
  }

  async ensureBucket() {
    try {
      await this.s3.send(new GetObjectCommand({ Bucket: this.bucket, Key: '.bucket-check' }));
    } catch {
      this.logger.warn(`Bucket ${this.bucket} may not exist or MinIO is not reachable`);
    }
  }

  validateFile(mimetype: string, size: number, buffer?: Buffer) {
    if (!ALLOWED_TYPES.includes(mimetype)) {
      throw new BadRequestException(`Tipo de archivo no permitido: ${mimetype}. Permitidos: ${ALLOWED_TYPES.join(', ')}`);
    }
    if (size > MAX_FILE_SIZE) {
      throw new BadRequestException(`Archivo demasiado grande: ${size} bytes. Maximo: ${MAX_FILE_SIZE}`);
    }
    if (buffer && !this.matchesMagicBytes(mimetype, buffer)) {
      throw new BadRequestException('El contenido del archivo no coincide con el tipo declarado');
    }
  }

  generateKey(tenantId: string, folder: string, mimetype: string) {
    const ext = EXTENSIONS_BY_MIME[mimetype] ?? 'bin';
    return `tenants/${tenantId}/${this.safeFolder(folder)}/${randomUUID()}.${ext}`;
  }

  safeFolder(folder: string | undefined) {
    const value = folder?.trim().toLowerCase() || 'uploads';
    if (!/^[a-z0-9/_-]{1,80}$/.test(value)) return 'uploads';
    return value.replace(/^\/+|\/+$/g, '') || 'uploads';
  }

  async getPresignedUploadUrl(tenantId: string, folder: string, mimetype: string) {
    this.validateFile(mimetype, 0);
    const key = this.generateKey(tenantId, folder, mimetype);
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ContentType: mimetype,
    });

    const url = await getSignedUrl(this.s3, command, { expiresIn: 300 });
    return { uploadUrl: url, key, bucket: this.bucket };
  }

  async deleteObject(key: string) {
    try {
      await this.s3.send(
        new DeleteObjectCommand({
          Bucket: this.bucket,
          Key: key,
        }),
      );
      return { deleted: true, key };
    } catch (err) {
      this.logger.error(`Failed to delete ${key}: ${String(err)}`);
      return { deleted: false, key, error: String(err) };
    }
  }

  getPublicUrl(key: string) {
    const endpoint = this.config.get<string>('MINIO_ENDPOINT') ?? 'localhost';
    const port = this.config.get<string>('MINIO_PORT') ?? '9000';
    return `http://${endpoint}:${port}/${this.bucket}/${key}`;
  }

  async uploadBuffer(key: string, buffer: Buffer, mimetype: string) {
    await this.s3.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: buffer,
        ContentType: mimetype,
        ContentDisposition: mimetype === 'application/pdf' ? 'attachment' : 'inline',
      }),
    );
    return { key, url: this.getPublicUrl(key) };
  }

  private matchesMagicBytes(mimetype: string, buffer: Buffer) {
    if (buffer.length < 4) return false;
    if (mimetype === 'image/jpeg') return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
    if (mimetype === 'image/png') return buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
    if (mimetype === 'image/webp') return buffer.subarray(0, 4).toString('ascii') === 'RIFF' && buffer.subarray(8, 12).toString('ascii') === 'WEBP';
    if (mimetype === 'application/pdf') return buffer.subarray(0, 4).toString('ascii') === '%PDF';
    return false;
  }
}

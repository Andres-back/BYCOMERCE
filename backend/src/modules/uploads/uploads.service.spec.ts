import { BadRequestException } from '@nestjs/common';
import { UploadsService } from './uploads.service';

describe('UploadsService', () => {
  const service = new UploadsService({
    get: jest.fn((key: string) => {
      const values: Record<string, string> = {
        MINIO_ENDPOINT: 'localhost',
        MINIO_PORT: '9000',
        MINIO_ACCESS_KEY: 'test',
        MINIO_SECRET_KEY: 'test',
        MINIO_BUCKET: 'bucket',
      };
      return values[key];
    }),
  } as never);

  it('accepts allowed image content that matches its mimetype', () => {
    const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]);
    expect(() => service.validateFile('image/png', png.length, png)).not.toThrow();
  });

  it('rejects content that does not match the declared mimetype', () => {
    const fakePng = Buffer.from('not really an image');
    expect(() => service.validateFile('image/png', fakePng.length, fakePng)).toThrow(BadRequestException);
  });

  it('generates tenant scoped keys with server-controlled extensions', () => {
    const key = service.generateKey('tenant-1', '../Products', 'image/webp');
    expect(key).toMatch(/^tenants\/tenant-1\/uploads\/[-0-9a-f]+\.webp$/);
  });
});

import {
  BadRequestException,
  Body,
  Controller,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RoleName } from '../../database/prisma-client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequestUser } from '../../common/types/request-user';
import { UploadsService } from './uploads.service';

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class UploadsController {
  constructor(private readonly uploadsService: UploadsService) {}

  @Post('uploads/sign')
  @Roles(RoleName.ADMIN_NEGOCIO, RoleName.SUPERVISOR)
  signUpload() {
    return {
      message: 'POST /uploads/upload con FormData (campo file) para subir archivo',
      allowedTypes: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
      maxFileSize: '15MB',
    };
  }

  @Post('uploads/upload')
  @Roles(RoleName.ADMIN_NEGOCIO, RoleName.SUPERVISOR, RoleName.CAJERO)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 15 * 1024 * 1024 },
    }),
  )
  async upload(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: RequestUser,
    @Body('folder') folder?: string,
  ) {
    if (!file) {
      throw new BadRequestException('Archivo requerido (campo file)');
    }

    if (!user.tenantId) {
      throw new BadRequestException('Tenant requerido para subir archivos');
    }

    this.uploadsService.validateFile(file.mimetype, file.size);
    const key = this.uploadsService.generateKey(user.tenantId, folder || 'products', file.originalname);
    const result = await this.uploadsService.uploadBuffer(key, file.buffer, file.mimetype);

    return {
      key: result.key,
      url: result.url,
      size: file.size,
      mimetype: file.mimetype,
      originalName: file.originalname,
    };
  }
}

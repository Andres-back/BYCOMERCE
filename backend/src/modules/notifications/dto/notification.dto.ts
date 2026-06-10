import { IsString, IsOptional, IsUUID, IsObject } from 'class-validator';

export class CreateNotificationDto {
  @IsString()
  tipo!: string;

  @IsString()
  titulo!: string;

  @IsString()
  mensaje!: string;

  @IsString()
  @IsOptional()
  level?: 'info' | 'warning' | 'error' | 'success';

  @IsUUID()
  @IsOptional()
  userId?: string;

  @IsObject()
  @IsOptional()
  data?: Record<string, unknown>;

  @IsString()
  @IsOptional()
  actionUrl?: string;

  @IsString()
  @IsOptional()
  expiresAt?: string;
}

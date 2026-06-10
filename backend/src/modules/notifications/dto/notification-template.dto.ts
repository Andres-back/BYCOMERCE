import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class CreateNotificationTemplateDto {
  @IsString()
  tipo!: string;

  @IsString()
  titulo!: string;

  @IsString()
  mensaje!: string;

  @IsOptional()
  canales?: string[];

  @IsOptional()
  criticidad?: string;

  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}

export class UpdateNotificationTemplateDto {
  @IsOptional()
  @IsString()
  titulo?: string;

  @IsOptional()
  @IsString()
  mensaje?: string;

  @IsOptional()
  canales?: string[];

  @IsOptional()
  criticidad?: string;

  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}

import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class UpdateNotificationPreferenceDto {
  @IsString()
  tipo!: string;

  @IsString()
  canal!: string;

  @IsBoolean()
  activo!: boolean;
}

export class BulkUpdatePreferencesDto {
  @IsOptional()
  preferencias?: UpdateNotificationPreferenceDto[];
}

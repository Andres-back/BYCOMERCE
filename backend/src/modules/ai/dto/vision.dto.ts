import { IsMimeType, IsOptional, IsString, MaxLength } from 'class-validator';

export class VisionImageDto {
  @IsString()
  fileBase64!: string;

  @IsMimeType()
  mimeType!: string;

  @IsOptional()
  @IsString()
  @MaxLength(180)
  fileName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  model?: string;
}

export class BrandingVisionDto extends VisionImageDto {
  @IsOptional()
  @IsString()
  @MaxLength(80)
  tipoNegocio?: string;
}

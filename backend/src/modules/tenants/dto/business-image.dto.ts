import { IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class CreateBusinessImageDto {
  @IsString()
  @MaxLength(500)
  url!: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  titulo?: string;

  @IsOptional()
  @IsString()
  @MaxLength(280)
  descripcion?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  orden?: number;
}

export class UpdateBusinessImageDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  titulo?: string;

  @IsOptional()
  @IsString()
  @MaxLength(280)
  descripcion?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  orden?: number;
}

export class ReorderBusinessImagesDto {
  @IsString({ each: true })
  ids!: string[];
}

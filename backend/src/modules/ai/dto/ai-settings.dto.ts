import { IsBoolean, IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

const VISION_PROVIDERS = ['OLLAMA', 'GROQ'] as const;

export class UpdateTenantAiSettingsDto {
  @IsOptional()
  @IsBoolean()
  assistantEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  visionEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  enterpriseIncluded?: boolean;

  @IsOptional()
  @IsString()
  @IsIn(VISION_PROVIDERS)
  visionProvider?: (typeof VISION_PROVIDERS)[number];

  @IsOptional()
  @IsString()
  @MaxLength(260)
  groqApiKey?: string;

  @IsOptional()
  @IsBoolean()
  clearGroqApiKey?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  groqModel?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  groqVisionModel?: string;

  @IsOptional()
  @IsString()
  @MaxLength(260)
  ollamaUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  ollamaVisionModel?: string;
}

import { IsOptional, IsString, MaxLength } from 'class-validator';

export class OrderActionDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  motivo?: string;
}

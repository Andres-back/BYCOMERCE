import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class CustomerQueryDto {
  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @IsIn(['TODOS', 'NUEVO', 'FRECUENTE', 'VIP', 'INACTIVO'])
  segment?: 'TODOS' | 'NUEVO' | 'FRECUENTE' | 'VIP' | 'INACTIVO';

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number;
}

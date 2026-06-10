import { IsEnum, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { CashMovementType } from '../../../database/prisma-client';

export class CreateCashMovementDto {
  @IsEnum(CashMovementType)
  tipo!: CashMovementType;

  @IsInt()
  @Min(0)
  monto!: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  descripcion?: string;
}

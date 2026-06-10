import { IsEnum, IsInt, IsOptional, IsString, MaxLength, Min, ValidateIf } from 'class-validator';
import { InventoryMovementType } from '../../../database/prisma-client';

export class AdjustStockDto {
  @IsEnum(InventoryMovementType)
  tipo!: InventoryMovementType;

  @ValidateIf((dto: AdjustStockDto) => dto.tipo !== InventoryMovementType.AJUSTE)
  @IsInt()
  @Min(1)
  cantidad?: number;

  @ValidateIf((dto: AdjustStockDto) => dto.tipo === InventoryMovementType.AJUSTE)
  @IsInt()
  @Min(0)
  stockNuevo?: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  observacion?: string;
}

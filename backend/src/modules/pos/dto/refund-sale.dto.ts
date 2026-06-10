import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export class RefundSaleItemDto {
  @IsUUID()
  saleItemId!: string;

  @IsInt()
  @Min(1)
  cantidad!: number;
}

export class RefundSaleDto {
  @IsString()
  @MaxLength(500)
  motivo!: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(80)
  @ValidateNested({ each: true })
  @Type(() => RefundSaleItemDto)
  items!: RefundSaleItemDto[];
}

export class VoidSaleDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  motivo?: string;
}

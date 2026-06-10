import { IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class OpenCashRegisterDto {
  @IsInt()
  @Min(0)
  saldoInicial!: number;
}

export class CloseCashRegisterDto {
  @IsInt()
  @Min(0)
  saldoFinal!: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  observacion?: string;
}

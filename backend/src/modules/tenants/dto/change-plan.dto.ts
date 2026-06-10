import { IsString, MaxLength } from 'class-validator';

export class ChangePlanDto {
  @IsString()
  planId!: string;

  @IsString()
  @MaxLength(240)
  motivo!: string;
}

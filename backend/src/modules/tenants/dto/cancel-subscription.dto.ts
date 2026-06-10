import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CancelSubscriptionDto {
  @IsOptional()
  @IsString()
  @MaxLength(240)
  motivo?: string;
}

import { IsEnum, IsOptional, IsString } from 'class-validator';
import { EstadoGeneral, RoleName } from '../../../database/prisma-client';

export class UserQueryDto {
  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @IsEnum(RoleName)
  rol?: RoleName;

  @IsOptional()
  @IsEnum(EstadoGeneral)
  estado?: EstadoGeneral;
}

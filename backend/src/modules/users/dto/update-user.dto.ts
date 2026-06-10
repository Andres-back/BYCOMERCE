import { PartialType } from '@nestjs/mapped-types';
import { IsEnum, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { RoleName } from '../../../database/prisma-client';
import { InviteUserDto } from './invite-user.dto';

export class UpdateUserDto extends PartialType(InviteUserDto) {
  @IsOptional()
  @IsEnum(RoleName)
  rol?: RoleName;

  @IsOptional()
  @IsString()
  @MinLength(8)
  @MaxLength(80)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/, {
    message: 'La contrasena debe incluir mayuscula, minuscula y numero',
  })
  newPassword?: string;
}

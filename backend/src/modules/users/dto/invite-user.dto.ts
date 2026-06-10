import { IsEmail, IsEnum, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { RoleName } from '../../../database/prisma-client';

export class InviteUserDto {
  @IsString()
  @MaxLength(160)
  nombre!: string;

  @IsEmail()
  @MaxLength(180)
  email!: string;

  @IsEnum(RoleName)
  rol!: RoleName;

  @IsOptional()
  @IsString()
  @MinLength(8)
  @MaxLength(80)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/, {
    message: 'La contrasena debe incluir mayuscula, minuscula y numero',
  })
  temporaryPassword?: string;
}

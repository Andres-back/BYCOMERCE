import { SetMetadata } from '@nestjs/common';
import { RoleName } from '../../database/prisma-client';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: RoleName[]) => SetMetadata(ROLES_KEY, roles);

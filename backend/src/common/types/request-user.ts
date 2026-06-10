import { RoleName } from '../../database/prisma-client';

export interface RequestUser {
  id: string;
  email: string;
  rol: RoleName;
  tenantId: string | null;
  isSuperAdmin: boolean;
}

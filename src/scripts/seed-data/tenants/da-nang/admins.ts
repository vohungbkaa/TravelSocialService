import { TenantUserRole } from '@prisma/client';
import { TenantAdminSeed } from '../types';

export const daNangAdmins: TenantAdminSeed[] = [
  {
    email: 'admin.danang@example.com',
    username: 'admin_danang',
    password: 'change-me',
    displayName: 'Admin Đà Nẵng',
    role: TenantUserRole.OWNER,
  },
];

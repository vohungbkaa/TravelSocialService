import { TenantUserRole } from '@prisma/client';
import { TenantAdminSeed } from '../types';

export const tienThangAdmins: TenantAdminSeed[] = [
  {
    email: 'admin.tienthang@example.com',
    username: 'admin_tienthang',
    password: 'change-me',
    displayName: 'Admin Tiến Thắng',
    role: TenantUserRole.OWNER,
  },
];

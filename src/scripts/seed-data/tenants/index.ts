import { daNangData } from './da-nang';
import { tienThangData } from './tien-thang';
import { TenantDataSeed } from './types';

export const TENANT_DATA: Record<string, TenantDataSeed> = {
  [tienThangData.tenant.code]: tienThangData,
  [daNangData.tenant.code]: daNangData,
};

export function getTenantData(code: string): TenantDataSeed {
  const seed = TENANT_DATA[code];
  if (!seed) {
    throw new Error(`Missing tenant seed data for TENANT_CODE=${code}`);
  }
  return seed;
}

export function getTenantCodes() {
  return Object.keys(TENANT_DATA);
}

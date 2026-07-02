import { Prisma, TenantUserRole } from '@prisma/client';
import type { TenantSeedInput } from '../../tenant-script-utils';

export interface TenantAdminSeed {
  email: string;
  username: string;
  password: string;
  displayName: string;
  role: TenantUserRole;
}

export interface MarkerIconSeed {
  key: string;
  name: string;
  iconUrl: string;
  markerColor: string;
  active?: boolean;
}

export interface PlaceCategorySeed {
  code: string;
  name: string;
  description?: string;
  markerIconKey: string;
  active?: boolean;
}

export interface TenantPlaceSeed {
  name: string;
  categoryCode: string;
  areaSlug?: string;
  summary?: string;
  description?: string;
  latitude?: number;
  longitude?: number;
  address?: string;
  bestTime?: string;
  localTip?: string;
  priceLevel?: 'FREE' | 'LOW' | 'MEDIUM' | 'HIGH';
  coverUrl?: string;
  videoUrl?: string;
  audioUrl?: string;
  galleryCaptions?: string[];
  published?: boolean;
}

export interface TenantDataSeed {
  tenant: TenantSeedInput;
  admins: TenantAdminSeed[];
  markerIcons: MarkerIconSeed[];
  categories: PlaceCategorySeed[];
  places: TenantPlaceSeed[];
}

export type JsonSeed = Prisma.InputJsonValue;

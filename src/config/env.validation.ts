import { z } from 'zod';

export const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
  PORT: z.coerce.number().default(3000),
  DATABASE_URL: z.string().url({ message: 'DATABASE_URL must be a valid URL' }),
  JWT_ACCESS_SECRET: z
    .string()
    .min(1, { message: 'JWT_ACCESS_SECRET is required' }),
  JWT_REFRESH_SECRET: z
    .string()
    .min(1, { message: 'JWT_REFRESH_SECRET is required' }),
  JWT_ACCESS_TTL: z.string().default('15m'),
  JWT_REFRESH_TTL: z.string().default('30d'),
  GOOGLE_CLIENT_IDS: z.string().optional().or(z.literal('')),
  FACEBOOK_APP_ID: z.string().optional().or(z.literal('')),
  FACEBOOK_APP_SECRET: z.string().optional().or(z.literal('')),
  R2_ACCOUNT_ID: z.string().optional().or(z.literal('')),
  R2_ACCESS_KEY_ID: z.string().optional().or(z.literal('')),
  R2_SECRET_ACCESS_KEY: z.string().optional().or(z.literal('')),
  R2_BUCKET: z.string().optional().or(z.literal('')),
  R2_PUBLIC_BASE_URL: z.string().optional().or(z.literal('')),
  R2_ENDPOINT: z.string().optional().or(z.literal('')),
  STORAGE_PROVIDER: z.enum(['local', 'r2']).default('local'),
  STORAGE_LOCAL_BASE_URL: z
    .string()
    .refine((value) => value.startsWith('/') || /^https?:\/\//i.test(value), {
      message:
        'STORAGE_LOCAL_BASE_URL must be an absolute URL or root-relative path',
    })
    .default('/media'),
  CORS_ORIGINS: z
    .string()
    .default(
      'http://localhost:3000,http://localhost:5173,http://tien-thang.localhost:5173,http://da-nang.localhost:5173,https://*.ngrok-free.app',
    ),
  DEFAULT_TENANT_CODE: z.string().default('tien-thang'),
  ENABLE_TENANT_CODE_OVERRIDE: z.enum(['true', 'false']).default('false'),
});

export type Env = z.infer<typeof envSchema>;

export function validateEnv(config: Record<string, unknown>) {
  const result = envSchema.safeParse(config);
  if (!result.success) {
    console.error('❌ Invalid environment configuration:');
    console.error(JSON.stringify(result.error.format(), null, 2));
    throw new Error('Invalid environment configuration');
  }
  return result.data;
}

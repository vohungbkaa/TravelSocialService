import { registerAs } from '@nestjs/config';

export default registerAs('app', () => ({
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3000', 10),
  databaseUrl: process.env.DATABASE_URL,
  socialAuth: {
    googleClientIds: (process.env.GOOGLE_CLIENT_IDS || '')
      .split(',')
      .map((clientId) => clientId.trim())
      .filter(Boolean),
    facebookAppId: process.env.FACEBOOK_APP_ID?.trim() || '',
    facebookAppSecret: process.env.FACEBOOK_APP_SECRET?.trim() || '',
  },
  r2: {
    accountId: process.env.R2_ACCOUNT_ID,
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    bucket: process.env.R2_BUCKET,
    publicBaseUrl: process.env.R2_PUBLIC_BASE_URL,
    endpoint: process.env.R2_ENDPOINT,
  },
  storage: {
    provider: process.env.STORAGE_PROVIDER || 'local',
    localBaseUrl: process.env.STORAGE_LOCAL_BASE_URL || '/media',
  },
  corsOrigins: (
    process.env.CORS_ORIGINS ||
    'http://localhost:3000,http://localhost:5173,http://tien-thang.localhost:5173,http://da-nang.localhost:5173,https://*.ngrok-free.app'
  )
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
  tenant: {
    defaultCode: process.env.DEFAULT_TENANT_CODE || 'tien-thang',
    enableCodeOverride: process.env.ENABLE_TENANT_CODE_OVERRIDE === 'true',
  },
}));

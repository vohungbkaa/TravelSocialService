export interface TenantContext {
  id: string;
  code: string;
  name: string;
  domain: string;
  enabled: boolean;
  theme?: unknown;
  settings?: unknown;
}

import { IncomingHttpHeaders } from 'http';

export function normalizeTenantHost(value?: string | string[]): string | undefined {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw) {
    return undefined;
  }

  let host = raw.trim().toLowerCase();
  if (!host) {
    return undefined;
  }

  try {
    if (host.startsWith('http://') || host.startsWith('https://')) {
      host = new URL(host).hostname;
    }
  } catch {
    return undefined;
  }

  return host.split(':')[0] || undefined;
}

export function getOriginHost(headers: IncomingHttpHeaders): string | undefined {
  return normalizeTenantHost(headers.origin);
}

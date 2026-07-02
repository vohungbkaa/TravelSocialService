const LOCAL_UPLOAD_PREFIX_RE = /^https?:\/\/[^/]+\/uploads\//i;

function getIconifyUrl(icon?: string | null) {
  const safeIcon = icon && /^[a-z0-9-]+$/i.test(icon) ? icon : 'map-pin';
  return `https://api.iconify.design/lucide:${safeIcon}.svg?color=%23ffffff`;
}

function getDefaultMarkerColor() {
  return '#6366f1';
}

export function toPublicMediaUrl(url?: string | null): string | null {
  if (!url) {
    return url ?? null;
  }

  if (url.startsWith('/uploads/')) {
    return `/media/${url.slice('/uploads/'.length)}`;
  }

  if (LOCAL_UPLOAD_PREFIX_RE.test(url)) {
    return url.replace(LOCAL_UPLOAD_PREFIX_RE, '/media/');
  }

  return url;
}

export function normalizeMediaUrls<T>(value: T): T {
  if (!value || typeof value !== 'object') {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => normalizeMediaUrls(item)) as T;
  }

  const record = value as Record<string, unknown>;
  const normalized: Record<string, unknown> = { ...record };

  const looksLikeCategory =
    'name' in normalized &&
    ('icon' in normalized || 'iconUrl' in normalized || 'markerColor' in normalized || 'active' in normalized) &&
    !('latitude' in normalized);

  if (looksLikeCategory) {
    const markerIcon = normalized.markerIcon as { iconUrl?: string; markerColor?: string } | undefined;
    normalized.iconUrl = markerIcon?.iconUrl || normalized.iconUrl || getIconifyUrl(normalized.icon as string | null | undefined);
    normalized.markerColor =
      markerIcon?.markerColor ||
      normalized.markerColor ||
      getDefaultMarkerColor();
  }

  for (const key of ['coverUrl', 'videoUrl', 'audioUrl', 'imageUrl']) {
    if (typeof normalized[key] === 'string' || normalized[key] === null) {
      normalized[key] = toPublicMediaUrl(normalized[key] as string | null);
    }
  }

  if (Array.isArray(normalized.images)) {
    normalized.images = normalizeMediaUrls(normalized.images);
  }

  if (normalized.area && typeof normalized.area === 'object') {
    normalized.area = normalizeMediaUrls(normalized.area);
  }

  return normalized as T;
}

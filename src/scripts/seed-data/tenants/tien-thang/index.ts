import { DEFAULT_MARKER_ICONS, DEFAULT_PLACE_CATEGORIES } from '../shared-categories';
import { TenantDataSeed } from '../types';
import { tienThangAdmins } from './admins';
import { tienThangPlaces } from './places';

export const tienThangData: TenantDataSeed = {
  tenant: {
    code: 'tien-thang',
    name: 'Xã Tiến Thắng',
    domain: 'tien-thang.localhost',
    theme: { primaryColor: '#10b981', logoUrl: null },
    settings: { defaultAreaSlug: 'tien-thang' },
    area: {
      slug: 'tien-thang',
      name: 'Xã Tiến Thắng',
      provinceCode: 'hanoi',
      centerLat: 21.195,
      centerLng: 105.6775,
      defaultRadiusKm: 3,
      published: true,
      description: 'Tiến Thắng là vùng đất có bề dày lịch sử, lưu giữ nhiều nét văn hóa làng quê truyền thống của vùng đồng bằng Bắc Bộ.',
    },
    mapLayer: {
      key: 'tien-thang-boundary',
      name: 'Ranh giới Xã Tiến Thắng',
      geoJsonFile: 'tien-thang.geojson',
      bounds: [[105.61, 21.145], [105.745, 21.245]],
      zoom: 13.2,
      style: {
        lineColor: '#10b981',
        fillColor: '#10b981',
        fillOpacity: 0.01,
        maskColor: '#f8f7f2',
      },
    },
  },
  admins: tienThangAdmins,
  markerIcons: DEFAULT_MARKER_ICONS,
  categories: DEFAULT_PLACE_CATEGORIES,
  places: tienThangPlaces,
};

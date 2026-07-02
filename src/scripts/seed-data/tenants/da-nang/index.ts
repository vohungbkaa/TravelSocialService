import { DEFAULT_MARKER_ICONS, DEFAULT_PLACE_CATEGORIES } from '../shared-categories';
import { TenantDataSeed } from '../types';
import { daNangAdmins } from './admins';
import { daNangPlaces } from './places';

export const daNangData: TenantDataSeed = {
  tenant: {
    code: 'da-nang',
    name: 'Thành phố Đà Nẵng',
    domain: 'da-nang.localhost',
    theme: { primaryColor: '#0284c7', logoUrl: null },
    settings: { defaultAreaSlug: 'da-nang', minZoom: 9, zoom: 11.2 },
    area: {
      slug: 'da-nang',
      name: 'Thành phố Đà Nẵng',
      provinceCode: '48',
      centerLat: 16.068501,
      centerLng: 108.2240242,
      defaultRadiusKm: 30,
      published: true,
      description: 'Đà Nẵng là thành phố ven biển miền Trung Việt Nam, nằm giữa Huế và Hội An.',
    },
    mapLayer: {
      key: 'da-nang-boundary',
      name: 'Ranh giới Thành phố Đà Nẵng',
      geoJsonFile: 'da-nang.geojson',
      bounds: [[107.2109165, 14.9513535], [109.0235567, 16.3340091]],
      zoom: 11.2,
      style: {
        lineColor: '#0284c7',
        fillColor: '#0284c7',
        fillOpacity: 0.01,
        maskColor: '#f8f7f2',
      },
    },
  },
  admins: daNangAdmins,
  markerIcons: DEFAULT_MARKER_ICONS,
  categories: DEFAULT_PLACE_CATEGORIES,
  places: daNangPlaces,
};

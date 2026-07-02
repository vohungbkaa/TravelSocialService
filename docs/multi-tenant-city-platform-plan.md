# Multi-tenant City Platform Plan

## 1. Muc tieu

He thong se ho tro nhieu thanh pho/khu vuc tren cung mot source code backend va web client. Moi thanh pho co the dung domain rieng, du lieu rieng, theme rieng, module rieng va boundary GeoJSON rieng.

Muc tieu quan trong:

- Khong tao project rieng cho tung thanh pho.
- Khong sua code backend/client moi khi them thanh pho moi.
- Them thanh pho bang database seed/admin tool.
- Bat/tat module theo tenant bang config.
- Web client tu load theme, feature flags, map config va GeoJSON boundary tu API.
- Boundary GeoJSON hien tai dang hard-code o client se duoc dua ve database.

## 2. Quyet dinh kien truc

Chon huong:

```txt
Mot codebase chung
Mot backend NestJS modular monolith
Mot web client Vue/Vite chung
Multi-tenant theo domain
Feature flag theo tenant
Theme/config theo tenant
GeoJSON boundary theo tenant/area tu database
```

Khong chon huong moi thanh pho mot project rieng vi se gay ton chi phi bao tri khi can fix bug, them module chung, thay doi schema hoac deploy nhieu noi.

Chi nen tach project/deploy rieng neu mot tenant co yeu cau rieng ve bao mat, hop dong, tai lon, database vat ly rieng hoac nghiep vu khac han san pham chinh.

## 3. Pham vi tenant

Them model `Tenant` dai dien cho mot city/site.

Vi du:

```txt
tien-thang.localhost     -> tenant: tien-thang
danang.example.vn        -> tenant: da-nang
nhatrang.example.vn      -> tenant: nha-trang
```

`Tenant` quan ly:

- Domain.
- Ten hien thi.
- Trang thai active/inactive.
- Theme.
- Map default config.
- Feature flags.
- Module config.
- Cac area/place/post/review thuoc tenant.

## 4. Database design de xuat

### 4.1. Tenant

```prisma
model Tenant {
  id          String   @id @default(uuid())
  code        String   @unique
  name        String
  domain      String   @unique
  enabled     Boolean  @default(true)
  theme       Json?
  settings    Json?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  areas       Area[]
  features    TenantFeature[]
  mapLayers   TenantMapLayer[]
  users       TenantUser[]
}
```

### 4.2. TenantFeature

```prisma
model TenantFeature {
  id        String  @id @default(uuid())
  tenantId  String
  feature   String
  enabled   Boolean @default(true)
  config    Json?

  tenant    Tenant  @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  @@unique([tenantId, feature])
  @@index([feature])
}
```

Feature examples:

```txt
places
reviews
posts
itinerary
booking
module_x
public_map
admin_area_crud
```

### 4.2.1. TenantUser cho admin theo tenant

He thong can 2 cap quan tri:

```txt
SUPER_ADMIN:
- Tai khoan cap cao nhat cua toan he thong.
- Co quyen xem/sua tat ca tenant.
- Co quyen tao tenant, tao admin tenant, gan user vao tenant.

ADMIN:
- Tai khoan quan tri theo tenant.
- Chi co full quyen voi tenant duoc gan.
- Khong xem va khong thao tac du lieu tenant khac.
```

`User.role` tiep tuc giu role global hien co:

```txt
USER
ADMIN
SUPER_ADMIN
```

Them bang gan user vao tenant:

```prisma
enum TenantUserRole {
  OWNER
  ADMIN
  EDITOR
  VIEWER
}

model TenantUser {
  id        String         @id @default(uuid())
  tenantId  String
  userId    String
  role      TenantUserRole @default(ADMIN)
  active    Boolean        @default(true)
  createdAt DateTime       @default(now())
  updatedAt DateTime       @updatedAt

  tenant    Tenant         @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  user      User           @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([tenantId, userId])
  @@index([userId, active])
  @@index([tenantId, active])
}
```

Quy tac:

- `SUPER_ADMIN` bo qua tenant membership va co full quyen cross-tenant.
- `ADMIN` phai co record active trong `TenantUser` cua tenant hien tai.
- Admin tenant duoc full quyen trong tenant do: places, areas, categories, map layers, media, feature config neu duoc cho phep.
- Admin tenant khong duoc query/list tenant khac.
- API admin phai filter theo `request.tenant.id` tru khi user la `SUPER_ADMIN` va API do la cross-tenant system API.
- JWT nen tiep tuc luu role global; tenant access nen check realtime tu database/cache theo `request.tenant.id` de khi go quyen admin co hieu luc nhanh.

### 4.3. Tenant-scoped Area

Them `tenantId` vao `Area`.

```prisma
model Area {
  id              String   @id @default(uuid())
  tenantId        String
  name            String
  slug            String
  provinceCode    String?
  description     String?
  coverUrl        String?
  centerLat       Decimal
  centerLng       Decimal
  defaultRadiusKm Decimal  @default(3)
  published       Boolean  @default(false)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  tenant          Tenant   @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  places          Place[]
  mapLayers       TenantMapLayer[]

  @@unique([tenantId, slug])
  @@index([tenantId, published])
}
```

Luu y: `Area.slug` hien tai dang unique toan he thong. Khi multi-tenant, can doi thanh `@@unique([tenantId, slug])` de cac tenant khac nhau co the dung cung slug.

### 4.4. Tenant-scoped Place

Them `tenantId` vao `Place`.

```prisma
model Place {
  id        String @id @default(uuid())
  tenantId  String
  areaId    String?
  slug      String

  @@unique([tenantId, slug])
  @@index([tenantId, status, createdAt])
  @@index([tenantId, areaId, sortOrder])
}
```

Moi query public/admin lien quan place phai filter theo `tenantId`.

### 4.5. TenantMapLayer cho GeoJSON boundary

Dung model rieng de quan ly boundary/layer GeoJSON. Viec them thanh pho moi chi can insert tenant, area va map layer vao database.

```prisma
enum MapLayerType {
  BOUNDARY
  MASK
  ROUTE
  CUSTOM
}

model TenantMapLayer {
  id          String       @id @default(uuid())
  tenantId    String
  areaId      String?
  key         String
  name        String
  type        MapLayerType @default(BOUNDARY)
  enabled     Boolean      @default(true)
  sortOrder   Int          @default(0)

  geoJson     Json?
  geoJsonUrl  String?
  style       Json?
  bounds      Json?
  centerLat   Decimal?
  centerLng   Decimal?
  zoom        Decimal?

  createdAt   DateTime     @default(now())
  updatedAt   DateTime     @updatedAt

  tenant      Tenant       @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  area        Area?        @relation(fields: [areaId], references: [id], onDelete: Cascade)

  @@unique([tenantId, key])
  @@index([tenantId, enabled, sortOrder])
  @@index([areaId])
}
```

Quy uoc:

- `geoJson`: luu inline GeoJSON trong Postgres JSONB, phu hop boundary vua/nho.
- `geoJsonUrl`: luu URL toi file tren R2/CDN neu GeoJSON lon.
- Neu ca hai co gia tri, client uu tien `geoJsonUrl` de giam payload API.
- `style`: mau line/fill/mask theo tenant hoac layer.
- `bounds`, `centerLat`, `centerLng`, `zoom`: map viewport config tu database.

Voi yeu cau "chi insert database", MVP nen ho tro `geoJson` inline truoc. Sau nay neu file lon, admin upload file len R2 va database chi luu URL.

Seed local hien tai luu file nguon trong `src/scripts/seed-data/`. GeoJSON Da Nang lay tu Nominatim/OpenStreetMap, khi seed vao `TenantMapLayer.geoJson` van giu attribution/source trong `properties`. Production nen chuyen file lon sang R2/CDN va database chi luu `geoJsonUrl`.

## 5. Tenant resolution flow

Backend doc tenant theo domain:

```txt
Request Host: danang.example.vn
        |
TenantResolverMiddleware
        |
Find Tenant by domain
        |
Attach request.tenant
        |
Controllers/Services filter by tenantId
```

Trong local development co the ho tro:

- `Host` header.
- `X-Tenant-Code` header cho test/admin.
- Env `DEFAULT_TENANT_CODE` khi chua co domain that.

Khong nen de client truyen `tenantId` tuy y trong query public vi de bi lay du lieu sai tenant.

### 5.1. Giai phap chon de thi cong

Chon giai phap don gian nhat va de mo rong nhat:

```txt
Production:
- Moi tenant co domain rieng.
- Tat ca domain tro ve cung web client.
- Web client goi cung backend API.
- Client gui X-Tenant-Host = window.location.hostname khi goi API.
- Backend resolve tenant bang X-Tenant-Host, fallback sang Origin/Host neu can.

Local development:
- Chi chay 1 Vite dev server, vi du port 5173.
- Chi chay 1 NestJS backend, vi du port 3000.
- Test tenant bang nhieu hostname cung tro ve localhost:
  http://tien-thang.localhost:5173
  http://da-nang.localhost:5173
- Client van gui X-Tenant-Host = window.location.hostname.

Ngrok demo:
- Neu chi co 1 ngrok URL free, hostname khong phan biet duoc tenant.
- Dung query dev override, vi du:
  https://abc-123.ngrok-free.app?tenant=tien-thang
  https://abc-123.ngrok-free.app?tenant=da-nang
- Client gui X-Tenant-Code trong dev/demo mode.
- Backend chi chap nhan X-Tenant-Code khi NODE_ENV khac production hoac ENABLE_TENANT_CODE_OVERRIDE=true.
```

Ly do chon:

- Khong can chay nhieu frontend/backend process.
- Khong can sua code moi khi them tenant.
- Local gan voi production vi van test theo hostname/domain.
- Backend khong phu thuoc vao viec API duoc mount cung domain hay khac domain.
- Sau nay co the doi sang reverse proxy doc `Host` truc tiep ma khong doi data model.

Khong chon `tenantId` trong query string cho production vi de bi gia mao va lam URL xau. Co the giu `X-Tenant-Code` chi cho test noi bo/admin/dev.

### 5.2. Local hostname strategy

Mot dev server co the nhan nhieu hostname tren cung mot port:

```txt
http://localhost:5173
http://tien-thang.localhost:5173
http://da-nang.localhost:5173
```

Tat ca deu vao cung Vite dev server. Diem khac nhau la browser gui `Host` khac nhau va frontend doc duoc:

```ts
window.location.hostname
```

Ket qua:

```txt
tien-thang.localhost
da-nang.localhost
```

Vite nen cau hinh:

```ts
server: {
  host: '0.0.0.0',
  port: 5173,
  allowedHosts: [
    'localhost',
    'tien-thang.localhost',
    'da-nang.localhost',
  ],
}
```

Tenant seed local:

```txt
code: tien-thang
domain: tien-thang.localhost

code: da-nang
domain: da-nang.localhost
```

### 5.3. Ngrok demo strategy

Ngrok free thuong cung cap mot public URL ngau nhien:

```txt
https://abc-123.ngrok-free.app
```

Neu chi co mot URL nhu tren, khong the test dung production domain model cho nhieu tenant vi ca Tien Thang va Da Nang deu co cung hostname `abc-123.ngrok-free.app`.

Chon co che demo don gian:

```txt
https://abc-123.ngrok-free.app?tenant=tien-thang
https://abc-123.ngrok-free.app?tenant=da-nang
```

Frontend chi doc query `tenant` trong dev/demo mode, sau do gui:

```txt
X-Tenant-Code: tien-thang
```

hoac:

```txt
X-Tenant-Code: da-nang
```

Backend chi chap nhan `X-Tenant-Code` khi:

```txt
NODE_ENV !== production
```

hoac khi bat ro:

```txt
ENABLE_TENANT_CODE_OVERRIDE=true
```

Trong production, khong dung query `?tenant=` lam co che chinh. Query nay chi la dev/demo override cho ngrok free.

Neu co ngrok reserved/custom domains, co the test giong production:

```txt
https://tien-thang.ngrok.app
https://da-nang.ngrok.app
```

Khi do database tenant domain se la:

```txt
tien-thang.ngrok.app -> tien-thang
da-nang.ngrok.app    -> da-nang
```

### 5.4. Production strategy

Production nen giu don gian:

```txt
danang.example.vn      -> same web client
nhatrang.example.vn    -> same web client
tienthang.example.vn   -> same web client

api.example.vn         -> same backend API
```

Web client doc:

```ts
window.location.hostname
```

Va gui sang backend:

```txt
X-Tenant-Host: danang.example.vn
```

Backend map domain voi bang `Tenant.domain`.

Neu backend duoc reverse proxy chung domain:

```txt
https://danang.example.vn/api/v1
```

Backend co the resolve truc tiep bang `Host`. Tuy nhien van giu `X-Tenant-Host` de ho tro truong hop frontend va API nam tren domain khac nhau.

### 5.5. API header contract

Moi request tu web client sang backend se them header:

```txt
X-Tenant-Host: tien-thang.localhost
```

Hoac:

```txt
X-Tenant-Host: da-nang.localhost
```

Backend normalize host truoc khi query database:

```txt
tien-thang.localhost:5173 -> tien-thang.localhost
https://da-nang.example.vn -> da-nang.example.vn
```

Thu tu resolve:

```txt
1. X-Tenant-Code neu NODE_ENV != production hoac ENABLE_TENANT_CODE_OVERRIDE=true
2. X-Tenant-Host
3. Origin hostname
4. Host hostname
5. DEFAULT_TENANT_CODE trong local/dev neu co
```

Neu khong tim thay tenant hoac tenant bi disabled, backend tra loi:

```txt
404 Tenant not found
```

hoac:

```txt
403 Tenant disabled
```

## 6. API contract de xuat

### 6.1. Public tenant config

```txt
GET /api/v1/tenant/config
```

Response:

```json
{
  "code": "da-nang",
  "name": "Thanh pho Da Nang",
  "domain": "danang.example.vn",
  "theme": {
    "primaryColor": "#0284c7",
    "logoUrl": "https://cdn.example.vn/logos/da-nang.svg"
  },
  "features": {
    "places": true,
    "reviews": true,
    "public_map": true,
    "module_x": false
  },
  "map": {
    "defaultAreaSlug": "da-nang",
    "styleUrl": "https://tiles.openfreemap.org/styles/positron",
    "center": [108.2208, 16.0471],
    "zoom": 11.5,
    "minZoom": 10,
    "maxZoom": 18
  }
}
```

### 6.2. Public areas

```txt
GET /api/v1/areas
GET /api/v1/areas/:slug
GET /api/v1/areas/:slug/places
```

Tat ca API nay tu filter tenant theo domain.

### 6.3. Public area map config

```txt
GET /api/v1/areas/:slug/map-config
```

Response:

```json
{
  "slug": "da-nang",
  "name": "Thanh pho Da Nang",
  "provinceCode": "48",
  "level": "province",
  "center": [108.2208, 16.0471],
  "zoom": 11.5,
  "bounds": [[107.95, 15.85], [108.45, 16.25]],
  "description": "...",
  "boundaryGeoJson": null,
  "boundaryGeoJsonUrl": null,
  "layers": [
    {
      "key": "city-boundary",
      "type": "BOUNDARY",
      "name": "Ranh gioi Da Nang",
      "geoJson": {
        "type": "Feature",
        "properties": {},
        "geometry": {
          "type": "Polygon",
          "coordinates": []
        }
      },
      "geoJsonUrl": null,
      "style": {
        "lineColor": "#10b981",
        "fillColor": "#10b981",
        "fillOpacity": 0.01,
        "maskColor": "#f8f7f2"
      }
    }
  ]
}
```

De tuong thich voi client hien tai, backend co the tra truc tiep `boundaryGeoJson` hoac `boundaryGeoJsonUrl` o root area config. Sau nay moi mo rong sang multi-layer.

## 7. Web client changes

Client hien tai dang co:

```txt
src/config/map.ts
MAP_CONFIG.areas['tien-thang'].boundaryGeoJsonUrl = '/data/tien-thang.geojson'
```

Can doi sang flow runtime:

```txt
App start
  |
GET /tenant/config
  |
Load theme/features/default map config
  |
GET /areas/:slug/map-config
  |
Pass areaConfig into PublicMap
  |
PublicMap fetches boundaryGeoJsonUrl or uses boundaryGeoJson inline
```

`PublicMap.vue` da co san logic:

```txt
props.areaConfig.boundaryGeoJson
props.areaConfig.boundaryGeoJsonUrl
```

Nen phan map component khong can viet lai lon. Viec can lam la thay `MAP_CONFIG` hard-code bang config lay tu API.

## 8. Backend implementation phases

### Phase 1 - Database foundation

- Them `Tenant`.
- Them `TenantFeature`.
- Them `TenantMapLayer`.
- Them `tenantId` vao `Area`.
- Them `tenantId` vao `Place`.
- Doi unique slug cua `Area` va `Place` sang unique theo tenant.
- Migration backfill du lieu hien tai vao tenant `tien-thang`.

### Phase 2 - Tenant runtime

- Tao `TenantsModule`.
- Tao `TenantResolverMiddleware` doc tenant tu `Host`.
- Tao decorator `@CurrentTenant()`.
- Tao `TenantFeatureService`.
- Tao `TenantAccessGuard` de check admin co quyen voi tenant hien tai.
- Dam bao public/admin API filter theo `tenantId`.
- Them test de tranh leak du lieu giua tenant.

### Phase 3 - Tenant config API

- Them `GET /tenant/config`.
- Them admin API quan ly tenant basic.
- Them admin API quan ly feature flags.
- Them seed cho `tien-thang`, `da-nang`, `nha-trang`.
- Them script tao nhanh tenant va admin tenant.

### Phase 4 - Dynamic map/GeoJSON

- Them `GET /areas/:slug/map-config`.
- Them admin API tao/cap nhat `TenantMapLayer`.
- Validate GeoJSON khi insert/update.
- Ho tro `geoJson` inline trong database.
- Ho tro `geoJsonUrl` cho file tren CDN/R2.
- Backfill `/public/data/tien-thang.geojson` vao `TenantMapLayer.geoJson` hoac upload len storage va luu URL.

### Phase 5 - Web client integration

- Them API client cho `/tenant/config`.
- Them API client cho `/areas/:slug/map-config`.
- Loai bo hard-code `MAP_CONFIG.areas['tien-thang']`.
- Giu fallback local config khi API loi trong dev neu can.
- Dung `features` de an/hien menu/module.
- Dung `theme` de set CSS variables.
- Dung map config tu database de render boundary.

### Phase 6 - Admin operations

- Man hinh admin tenant list/detail.
- Man hinh bat/tat feature.
- Man hinh upload/paste GeoJSON boundary.
- Preview boundary tren map truoc khi publish.
- Nut publish/unpublish tenant map layer.
- Man hinh gan user/admin vao tenant.
- Super admin thay tat ca tenant; admin tenant chi thay tenant cua minh.

## 8.1. Admin account scripts de xuat

Can co cac script nhanh de van hanh local/demo/production:

```txt
npm run tenant:create
npm run tenant:seed:local
npm run tenant:admin:create
npm run tenant:admin:assign
npm run tenant:bootstrap
```

### tenant:create

Tao tenant moi.

Input qua env hoac CLI args:

```txt
TENANT_CODE=da-nang
TENANT_NAME="Thanh pho Da Nang"
TENANT_DOMAIN=da-nang.localhost
```

Ket qua:

- Upsert `Tenant`.
- Tao feature flags mac dinh.
- Tao map/settings mac dinh neu co.

### tenant:admin:create

Tao user admin tenant va gan vao tenant.

Input:

```txt
TENANT_CODE=da-nang
ADMIN_EMAIL=admin.danang@example.com
ADMIN_USERNAME=admin_danang
ADMIN_PASSWORD=change-me
ADMIN_DISPLAY_NAME="Admin Da Nang"
TENANT_USER_ROLE=OWNER
```

Ket qua:

- Upsert `User` voi `role=ADMIN`.
- Upsert `UserProfile`.
- Upsert `TenantUser` voi tenant tu `TENANT_CODE`.

### tenant:admin:assign

Gan user da ton tai vao tenant.

Input:

```txt
TENANT_CODE=da-nang
ADMIN_USERNAME=admin_danang
TENANT_USER_ROLE=ADMIN
```

Ket qua:

- Tim user theo username/email.
- Set `User.role=ADMIN` neu chua phai `ADMIN`/`SUPER_ADMIN`.
- Upsert `TenantUser`.

### tenant:bootstrap

Dung cho local/demo. Tao tron goi:

- Tenant.
- Feature flags.
- Area mac dinh.
- Tenant map layer/GeoJSON.
- Tenant admin account.

Vi du:

```txt
TENANT_CODE=tien-thang TENANT_DOMAIN=tien-thang.localhost npm run tenant:bootstrap
TENANT_CODE=da-nang TENANT_DOMAIN=da-nang.localhost npm run tenant:bootstrap
```

### Super admin

Script `db:seed:admin` hien tai tiep tuc dung de tao `SUPER_ADMIN` global.

Quy uoc:

- `SUPER_ADMIN` khong can `TenantUser`.
- `SUPER_ADMIN` co quyen cross-tenant.
- Khong tao qua nhieu `SUPER_ADMIN`; chi dung cho owner/system operator.
- Admin van hanh tung thanh pho nen dung `ADMIN + TenantUser`.

## 9. Acceptance criteria

Them thanh pho moi khong can sua source code:

1. Insert `Tenant`.
2. Insert `TenantFeature`.
3. Insert `Area`.
4. Insert `TenantMapLayer` voi `geoJson` hoac `geoJsonUrl`.
5. Insert places/categories lien quan tenant.
6. Tro domain ve frontend/backend.
7. Truy cap domain moi thay theme, feature va boundary map rieng.
8. Tao admin tenant bang script va chi quan ly du lieu tenant do.

Vi du tenant A va B cung dung `module_x`, tenant C khong dung:

```txt
Tenant A: module_x=true
Tenant B: module_x=true
Tenant C: module_x=false
```

Frontend khong hien module C. Backend guard chan API module C.

## 10. Rủi ro va nguyen tac can giu

- Moi query du lieu business phai co `tenantId`.
- Khong tin `tenantId` tu client public.
- Slug phai unique theo tenant, khong unique global.
- Cache phai include tenant key.
- File/media path nen prefix theo tenant code.
- GeoJSON lon khong nen tra inline trong `/tenant/config`.
- Admin super admin moi duoc quan ly cross-tenant.
- Admin tenant chi thay du lieu tenant cua minh.
- Moi admin API can co test/guard tranh leak du lieu cross-tenant.

## 11. Thu tu thi cong khuyen nghi

Lam theo thu tu sau de it rui ro:

1. Database migration + backfill tenant hien tai.
2. Tenant resolver + filter API hien co.
3. Tenant config endpoint.
4. Dynamic area map config + GeoJSON DB.
5. Client load config tu API.
6. Feature guard + feature UI.
7. Admin tooling.

Khong nen lam custom extension rieng cho tung thanh pho ngay tu dau. Nen dung config/feature flag truoc; chi tach extension khi mot thanh pho co logic thuc su khac.

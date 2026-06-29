# Huong dan test API admin dang dia danh

Tai lieu nay dung de test flow:

```txt
Admin login -> tao area -> tao dia danh -> publish dia danh -> client load dia danh public
```

Base URL local:

```txt
http://localhost:3000/api/v1
```

Swagger:

```txt
http://localhost:3000/docs
```

## 1. Chuan bi database va seed data

Co 2 cach chay PostgreSQL local:

- Cach A: Docker Compose.
- Cach B: PostgreSQL cai truc tiep tren may.

Neu ban khong muon dung Docker, xem muc `1B`.

## 1A. Chay PostgreSQL bang Docker Compose

Chay PostgreSQL local:

```bash
docker compose up -d postgres
```

Neu chua co `.env`:

```bash
cp .env.example .env
```

Voi Docker Compose mac dinh, `DATABASE_URL` la:

```txt
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/travel_social
```

## 1B. Chay PostgreSQL cai truc tiep tren may, khong dung Docker

Neu may da cai PostgreSQL, tao database `travel_social`.

### macOS Homebrew

Neu cai PostgreSQL bang Homebrew:

```bash
brew services start postgresql
```

Kiem tra `psql`:

```bash
psql --version
```

Tao database:

```bash
createdb travel_social
```

Neu local PostgreSQL dung user macOS hien tai, `DATABASE_URL` co the la:

```txt
DATABASE_URL=postgresql://localhost:5432/travel_social
```

Hoac:

```txt
DATABASE_URL=postgresql://<your_macos_username>@localhost:5432/travel_social
```

### Tao user/password rieng cho project

Neu muon tao user rieng:

```bash
psql postgres
```

Trong shell `psql`, chay:

```sql
CREATE USER travel_social_user WITH PASSWORD 'travel_social_password';
CREATE DATABASE travel_social OWNER travel_social_user;
GRANT ALL PRIVILEGES ON DATABASE travel_social TO travel_social_user;
\q
```

Sau do set `.env`:

```txt
DATABASE_URL=postgresql://travel_social_user:travel_social_password@localhost:5432/travel_social
```

### Neu database da ton tai

Neu `createdb travel_social` bao loi database da ton tai, co the bo qua va dung database hien co.

Kiem tra ket noi:

```bash
psql "$DATABASE_URL"
```

Hoac neu chua export env:

```bash
psql postgresql://travel_social_user:travel_social_password@localhost:5432/travel_social
```

Thoat `psql`:

```txt
\q
```

## 1C. Chay migration va seed

Chay migration:

```bash
npm run prisma:migrate
```

Seed admin user:

```bash
npm run db:seed:admin
```

Seed place categories:

```bash
npm run db:seed:categories
```

Mac dinh `.env.example` dang co admin:

```txt
SEED_ADMIN_EMAIL=admin@travelsocial.xyz
SEED_ADMIN_USERNAME=admin
SEED_ADMIN_PASSWORD=SuperSecureAdminPassword123!
SEED_ADMIN_DISPLAY_NAME=Super Admin
```

## 2. Chay API server

```bash
npm run start:dev
```

Kiem tra health:

```bash
curl http://localhost:3000/api/v1/health
```

Ket qua dung:

```json
{
  "data": {
    "status": "ok",
    "service": "travel-social-backend",
    "timestamp": "..."
  }
}
```

## 3. Login admin va lay access token

```bash
LOGIN_JSON=$(curl -s -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "identifier": "admin",
    "password": "SuperSecureAdminPassword123!"
  }')

ACCESS_TOKEN=$(node -e "const j=JSON.parse(process.argv[1]); console.log(j.data.accessToken)" "$LOGIN_JSON")

echo $ACCESS_TOKEN
```

Neu login thanh cong, `ACCESS_TOKEN` se co gia tri JWT.

Tat ca API admin phai gui header:

```txt
Authorization: Bearer <ACCESS_TOKEN>
```

## 4. Lay categoryId

```bash
CATEGORIES_JSON=$(curl -s http://localhost:3000/api/v1/place-categories)

CATEGORY_ID=$(node -e "const j=JSON.parse(process.argv[1]); const c=j.data.find(x=>x.code==='culture') || j.data[0]; console.log(c.id)" "$CATEGORIES_JSON")

echo $CATEGORY_ID
```

API:

```txt
GET /api/v1/place-categories
```

## 5. Tao area public

```bash
AREA_JSON=$(curl -s -X POST http://localhost:3000/api/v1/admin/areas \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -d '{
    "name": "Tiến Thắng",
    "slug": "tien-thang",
    "provinceCode": "hn",
    "description": "Khu vực khám phá địa danh địa phương Tiến Thắng.",
    "centerLat": 21.195,
    "centerLng": 105.6775,
    "defaultRadiusKm": 3,
    "published": true
  }')

AREA_ID=$(node -e "const j=JSON.parse(process.argv[1]); console.log(j.data.id)" "$AREA_JSON")

echo $AREA_ID
```

API:

```txt
POST /api/v1/admin/areas
```

Neu gap loi `SLUG_ALREADY_EXISTS`, lay area da co:

```bash
AREAS_JSON=$(curl -s -H "Authorization: Bearer $ACCESS_TOKEN" \
  http://localhost:3000/api/v1/admin/areas)

AREA_ID=$(node -e "const j=JSON.parse(process.argv[1]); const a=j.data.find(x=>x.slug==='tien-thang'); console.log(a.id)" "$AREAS_JSON")

echo $AREA_ID
```

Luu y: hien tai area publish bang field `published: true` khi create/update. Chua co endpoint rieng `/admin/areas/:id/publish`.

Neu can update area:

```bash
curl -s -X PUT http://localhost:3000/api/v1/admin/areas/$AREA_ID \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -d '{
    "published": true
  }'
```

## 6. Tao dia danh draft

```bash
PLACE_JSON=$(curl -s -X POST http://localhost:3000/api/v1/admin/places \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -d "{
    \"name\": \"Đình Bạch Trữ\",
    \"summary\": \"Địa danh văn hóa lịch sử tại Tiến Thắng.\",
    \"description\": \"Đình Bạch Trữ là một công trình văn hóa địa phương có giá trị lịch sử và kiến trúc.\",
    \"localTip\": \"Nên ghé vào buổi sáng và giữ trang phục lịch sự.\",
    \"bestTime\": \"Sáng sớm hoặc chiều mát\",
    \"priceRange\": \"Miễn phí\",
    \"categoryId\": \"$CATEGORY_ID\",
    \"areaId\": \"$AREA_ID\",
    \"address\": \"Tiến Thắng, Mê Linh, Hà Nội\",
    \"provinceCode\": \"hn\",
    \"latitude\": 21.2018,
    \"longitude\": 105.6925,
    \"coverUrl\": \"/images/image_4.jpeg\",
    \"sortOrder\": 1
  }")

PLACE_ID=$(node -e "const j=JSON.parse(process.argv[1]); console.log(j.data.id)" "$PLACE_JSON")

echo $PLACE_ID
```

API:

```txt
POST /api/v1/admin/places
```

Dia danh moi tao se co status:

```txt
DRAFT
```

## 7. Them anh gallery cho dia danh

```bash
curl -s -X POST http://localhost:3000/api/v1/admin/places/$PLACE_ID/images \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -d '{
    "imageUrl": "/images/image_4.jpeg",
    "caption": "Cổng đình Bạch Trữ",
    "sortOrder": 0
  }'
```

API:

```txt
POST /api/v1/admin/places/:id/images
```

## 8. Publish dia danh

```bash
curl -s -X PATCH http://localhost:3000/api/v1/admin/places/$PLACE_ID/publish \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

API:

```txt
PATCH /api/v1/admin/places/:id/publish
```

Publish se fail neu thieu cac field bat buoc:

```txt
name
categoryId
areaId
latitude
longitude
```

## 9. Test client load area public

```bash
curl -s http://localhost:3000/api/v1/areas
```

API:

```txt
GET /api/v1/areas
```

Load chi tiet area theo slug:

```bash
curl -s http://localhost:3000/api/v1/areas/tien-thang
```

API:

```txt
GET /api/v1/areas/:slug
```

## 10. Test client load dia danh public theo area

Day la API phu hop de public map load marker theo area:

```bash
curl -s http://localhost:3000/api/v1/areas/tien-thang/places
```

API:

```txt
GET /api/v1/areas/:slug/places
```

Ket qua can co dia danh vua publish, gom cac field chinh:

```txt
id
name
slug
summary
description
localTip
bestTime
priceRange
address
latitude
longitude
coverUrl
status = PUBLISHED
category
images
```

## 11. Test client load dia danh public bang filter

```bash
curl -s "http://localhost:3000/api/v1/places?areaSlug=tien-thang"
```

API:

```txt
GET /api/v1/places?areaSlug=tien-thang
```

Ket qua co format:

```json
{
  "data": {
    "places": [],
    "nextCursor": null
  }
}
```

## 12. Test client load chi tiet dia danh

Bang id:

```bash
curl -s http://localhost:3000/api/v1/places/$PLACE_ID
```

API:

```txt
GET /api/v1/places/:id
```

Bang slug:

```bash
curl -s http://localhost:3000/api/v1/places/slug/dinh-bach-tru
```

API:

```txt
GET /api/v1/places/slug/:slug
```

Load images:

```bash
curl -s http://localhost:3000/api/v1/places/$PLACE_ID/images
```

API:

```txt
GET /api/v1/places/:id/images
```

## 13. Loi thuong gap

### 401 Unauthorized

Nguyen nhan:

- Thieu header `Authorization`.
- Token sai hoac het han.

Xu ly:

```bash
echo $ACCESS_TOKEN
```

Login lai neu token rong/het han.

### 403 Forbidden

Nguyen nhan:

- User khong co role `ADMIN` hoac `SUPER_ADMIN`.

Xu ly:

```bash
npm run db:seed:admin
```

Sau do login lai.

### SLUG_ALREADY_EXISTS

Nguyen nhan:

- Area/place slug da ton tai.

Xu ly:

- Dung lai record da co.
- Hoac doi slug/name.

### PLACE_INCOMPLETE_FOR_PUBLISHING

Nguyen nhan:

- Dia danh thieu field bat buoc de publish.

Can co:

```txt
name
categoryId
areaId
latitude
longitude
```

### Public API khong thay dia danh

Kiem tra:

- Area da `published: true` chua.
- Place da `status: PUBLISHED` chua.
- Place co dung `areaId` cua area khong.

## 14. Quick check list

```txt
[ ] docker compose up -d postgres
[ ] npm run prisma:migrate
[ ] npm run db:seed:admin
[ ] npm run db:seed:categories
[ ] npm run start:dev
[ ] login admin lay ACCESS_TOKEN
[ ] lay CATEGORY_ID
[ ] tao/publish AREA_ID
[ ] tao PLACE_ID
[ ] them image optional
[ ] publish PLACE_ID
[ ] GET /areas/tien-thang/places thay dia danh
```

# Phase 6 - Future Itinerary Preparation Tasks

Phase nay khong thi cong recommendation engine ngay. Muc tieu la chuan bi data va boundary de sau nay xay tinh nang goi y lo trinh chi phi toi uu dua tren chia se cua user.

Trang thai:

- De sau MVP.
- Chi lam khi cac phase social/travel core da co du user/content.

Khong lam trong phase nay:

- Khong AI itinerary generation production.
- Khong paid map routing bat buoc.
- Khong ML pipeline.
- Khong background event streaming phuc tap.

## P6-T01 - Validate itinerary-ready place fields

Objective:

- Dam bao place data co du field de tinh itinerary sau nay.

Dependencies:

- P4-T02.

Checklist:

```txt
Place has latitude/longitude.
Place has category.
Place has province/district.
Place has priceLevel.
Place has estimatedMinCost/estimatedMaxCost.
Place has averageVisitDurationMinutes.
Place can store openingHours.
Place has ratingAvg/ratingCount/postCount.
```

Implementation steps:

1. Review Prisma schema.
2. Review create/update place DTO.
3. Review admin place form/API if exists.
4. Add missing optional fields only if absent.
5. Add validation for cost/duration.
6. Update Swagger docs.

Acceptance criteria:

- Admin co the nhap cost/duration cho place.
- Public place detail tra cost/duration fields neu co.
- Field nullable de khong block MVP data.

## P6-T02 - Add review cost and visit duration signals

Objective:

- Thu thap signal chi phi/thoi gian tu review cua user.

Dependencies:

- P4-T08.

Fields:

```txt
PlaceReview.costPerPerson
PlaceReview.visitDurationMinutes
PlaceReview.visitDate
```

Implementation steps:

1. Verify schema co fields.
2. Update create/update review DTO.
3. Validate:
   - costPerPerson >= 0.
   - visitDurationMinutes 15-1440.
4. Update response.
5. Do not require these fields.

Acceptance criteria:

- User review co the bo trong cost/duration.
- Neu co cost/duration, data duoc luu.
- Invalid values rejected.

## P6-T03 - Place cost profile schema

Objective:

- Tao bang cost profile tong hop cho place, dung sau nay de estimate itinerary.

Dependencies:

- P4-T08.

Model:

```txt
PlaceCostProfile
- placeId pk
- minCostPerPerson nullable
- maxCostPerPerson nullable
- typicalCostPerPerson nullable
- currency default VND
- source enum ADMIN/USER_REVIEW/ESTIMATED
- updatedAt
```

Implementation steps:

1. Add model va enum.
2. Add relation toi Place.
3. Migration.
4. Admin API update cost profile.
5. Public place detail include cost profile.

Acceptance criteria:

- Admin update cost profile.
- Public API read cost profile.
- Values nullable.

Notes:

- Chua auto-compute tu reviews trong task nay.

## P6-T04 - Aggregate cost profile from reviews

Objective:

- Uoc tinh cost profile tu review data neu admin chua nhap.

Dependencies:

- P6-T03.

Implementation steps:

1. Query reviews published co costPerPerson.
2. Compute:
   - min.
   - max.
   - median/typical.
3. Update PlaceCostProfile source USER_REVIEW neu chua co ADMIN override.
4. Trigger recompute sau create/update/delete review.
5. Keep simple synchronous for now; no queue.

Acceptance criteria:

- Review cost moi co the cap nhat cost profile.
- ADMIN source khong bi overwrite neu policy uu tien admin.
- Missing review cost khong crash.

## P6-T05 - User preferences schema/API

Objective:

- Luu so thich user de dung cho itinerary/recommendation sau nay.

Dependencies:

- P1-T07.
- P4-T01.

Model:

```txt
UserPreference
- userId pk
- preferredCategories json
- preferredBudgetLevel enum LOW/MEDIUM/HIGH nullable
- preferredTripPace enum RELAXED/BALANCED/PACKED nullable
- avoidCategories json nullable
- updatedAt
```

APIs:

```txt
GET   /api/v1/users/me/preferences
PATCH /api/v1/users/me/preferences
```

Implementation steps:

1. Add model/enums.
2. Validate category codes exist.
3. Allow empty preferences.
4. Return normalized preference object.

Acceptance criteria:

- User update preferences cua minh.
- Invalid category rejected.
- Preferences optional, khong anh huong core app.

## P6-T06 - Itinerary schema only

Objective:

- Tao schema luu itinerary nhung chua generate recommendation.

Dependencies:

- P4-T02.
- P6-T05.

Models:

```txt
Itinerary
- id uuid
- ownerId nullable
- title
- provinceCode nullable
- startPlaceId nullable
- budgetMin nullable
- budgetMax nullable
- totalEstimatedCost nullable
- totalDurationMinutes nullable
- visibility enum PRIVATE/PUBLIC/SHARED
- source enum USER_CREATED/SYSTEM_GENERATED
- createdAt
- updatedAt

ItineraryItem
- id uuid
- itineraryId
- placeId
- sortOrder
- plannedStartTime nullable
- plannedDurationMinutes nullable
- estimatedCost nullable
- note nullable
```

Implementation steps:

1. Add models/enums.
2. Add indexes ownerId, provinceCode, visibility.
3. Migration.
4. No recommendation endpoint yet.

Acceptance criteria:

- Schema supports saved itinerary.
- Items ordered by sortOrder.

## P6-T07 - Manual itinerary CRUD

Objective:

- Cho user tao/sua/luu itinerary thu cong truoc khi co recommendation.

Dependencies:

- P6-T06.

APIs:

```txt
POST   /api/v1/itineraries
GET    /api/v1/itineraries/:id
PATCH  /api/v1/itineraries/:id
DELETE /api/v1/itineraries/:id
POST   /api/v1/itineraries/:id/items
PATCH  /api/v1/itineraries/:id/items/:itemId
DELETE /api/v1/itineraries/:id/items/:itemId
```

Implementation steps:

1. Owner-only CRUD for private itineraries.
2. Validate places exist and published.
3. Recompute totalEstimatedCost/duration from items.
4. Sort items by sortOrder.
5. Public visibility read allowed only if visibility PUBLIC.

Acceptance criteria:

- User tao itinerary thu cong.
- User khong sua itinerary cua nguoi khac.
- Item place invalid rejected.

## P6-T08 - Recommendation service boundary without implementation

Objective:

- Tao boundary code de sau nay implement recommendation ma khong anh huong core modules.

Dependencies:

- P6-T06.

Expected files:

```txt
src/recommendation/recommendation.module.ts
src/recommendation/itinerary-recommendation.service.ts
src/recommendation/dto/recommend-itinerary.dto.ts
```

API optional stub:

```txt
POST /api/v1/itineraries/recommend
```

Implementation steps:

1. Tao DTO input:
   - provinceCode.
   - tripDays.
   - budgetLevel.
   - interests.
   - pace.
   - transportMode.
2. Service method co interface ro.
3. Neu expose API, return 501 NOT_IMPLEMENTED hoac feature flag disabled.
4. Khong viet fake recommendation production neu chua co yeu cau.

Acceptance criteria:

- Boundary compile.
- Core modules khong phu thuoc nguoc vao recommendation.
- Feature disabled mac dinh.

## P6-T09 - Rule-based itinerary MVP design task

Objective:

- Khi san sang thi cong, viet design doc ngan cho rule-based recommendation.

Dependencies:

- P6-T03.
- P6-T05.
- P6-T07.

Design must cover:

```txt
Candidate place selection.
Scoring formula.
Budget constraint.
Duration constraint.
Distance penalty.
Category diversity.
Fallback khi thieu data.
How to explain recommendation.
How to collect feedback.
```

Acceptance criteria:

- Co design doc truoc khi code recommendation.
- Khong bat dau bang AI/ML.
- Cost/route hien thi la uoc tinh, khong cam ket chinh xac.


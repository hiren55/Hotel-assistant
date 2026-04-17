# PHASE 6 — API TESTING (CRITICAL)

## Objective
Start the API server, verify all endpoints work against Neon, and systematically debug any failures.

---

## Prerequisites

- [ ] Phase 5 complete (Prisma verified and connected)
- [ ] Redis running (`redis-server` or via Docker)
- [ ] `.env` files fully updated

---

## Step 1: Start the API Server

```bash
# From project root
pnpm --filter api dev

# Or
cd apps/api
pnpm dev
```

**Expected output:**
```
[Nest] LOG [NestFactory] Starting Nest application...
[Nest] LOG [InstanceLoader] ...modules loaded...
[Nest] LOG [NestApplication] Application is running on: http://localhost:3001
```

**Check for errors:**
- ❌ Database connection errors → verify `DATABASE_URL`
- ❌ Redis connection errors → verify Redis is running
- ❌ Module initialization errors → check logs carefully

---

## Step 2: Verify Swagger UI

Open in browser: **http://localhost:3001/api/docs**

**Verify:**
- [ ] Swagger UI loads correctly
- [ ] All endpoint groups are visible
- [ ] No console errors in browser DevTools

---

## Step 3: Test Authentication Endpoints

> [!WARNING]
> After migrating to NestJS JWT auth (Phase 2), the auth endpoints will use bcrypt + JWT instead of Supabase Auth. If auth migration hasn't been done yet, auth endpoints will fail — this is expected.

### 3.1 Register a Test User

```bash
# POST /api/v1/auth/register
curl -X POST http://localhost:3001/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "TestPassword123!",
    "name": "Test User"
  }'
```

**Expected:** `201 Created` with user data and tokens.

### 3.2 Login

```bash
# POST /api/v1/auth/login
curl -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "TestPassword123!"
  }'
```

**Expected:** `200 OK` with `accessToken` and `refreshToken`.

### 3.3 Access Protected Endpoint

```bash
# Use the accessToken from login response
curl http://localhost:3001/api/v1/auth/me \
  -H "Authorization: Bearer ACCESS_TOKEN_HERE"
```

**Expected:** `200 OK` with user profile.

---

## Step 4: Test Hotel CRUD

### 4.1 Create Hotel

```bash
curl -X POST http://localhost:3001/api/v1/hotels \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ACCESS_TOKEN_HERE" \
  -d '{
    "name": "Test Hotel",
    "slug": "test-hotel",
    "email": "info@testhotel.com"
  }'
```

### 4.2 Get Hotel

```bash
curl http://localhost:3001/api/v1/hotels/HOTEL_ID \
  -H "Authorization: Bearer ACCESS_TOKEN_HERE"
```

---

## Step 5: Test Booking Endpoints

### 5.1 Create Room (prerequisite for booking)

```bash
curl -X POST http://localhost:3001/api/v1/hotels/HOTEL_ID/rooms \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ACCESS_TOKEN_HERE" \
  -d '{
    "name": "Deluxe Suite",
    "type": "suite",
    "capacity": 2,
    "basePrice": 150.00,
    "currency": "USD"
  }'
```

### 5.2 Create Booking

```bash
curl -X POST http://localhost:3001/api/v1/hotels/HOTEL_ID/bookings \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ACCESS_TOKEN_HERE" \
  -d '{
    "roomId": "ROOM_ID",
    "guestName": "John Doe",
    "guestEmail": "john@example.com",
    "checkIn": "2026-04-01",
    "checkOut": "2026-04-03",
    "adults": 2,
    "totalPrice": 300.00
  }'
```

---

## Step 6: Test Multi-Tenant Isolation

### 6.1 Create Second Hotel/User

Register a second user with a different hotel. Then try accessing the first hotel's data:

```bash
# This should return 404 (not 403!) to prevent enumeration
curl http://localhost:3001/api/v1/hotels/FIRST_HOTEL_ID/rooms \
  -H "Authorization: Bearer SECOND_USER_TOKEN"
```

**Expected:** `404 Not Found` (NOT `403 Forbidden`)

---

## Step 7: Test AI Conversation Storage

### 7.1 Send Chat Message

```bash
curl -X POST http://localhost:3001/api/v1/chat/HOTEL_ID \
  -H "Content-Type: application/json" \
  -d '{
    "message": "What rooms are available?",
    "sessionId": "test-session-123"
  }'
```

### 7.2 Verify Conversation Stored

```bash
curl http://localhost:3001/api/v1/hotels/HOTEL_ID/conversations \
  -H "Authorization: Bearer ACCESS_TOKEN_HERE"
```

---

## Step 8: Verify Redis Session Consistency

```bash
# Check Redis connection
redis-cli ping
# Expected: PONG

# Check if sessions are stored
redis-cli keys "*"
```

---

## Debugging Guide

### Error: "Cannot connect to database"
1. Check `DATABASE_URL` in `.env`
2. Verify Neon is not suspended (free tier auto-suspends)
3. Try `npx prisma db pull` to test connection

### Error: "Invalid token" or auth failures
1. Check `JWT_SECRET` is set
2. Verify token format (should be `Bearer <token>`)
3. If still using Supabase Auth, it will fail — complete Phase 2 auth migration first

### Error: "Hotel not found" for existing data
1. Check if data was migrated (Phase 4)
2. Verify `hotelId` in the request matches data in DB
3. Check `user.hotelId` matches the hotel being accessed

### Error: 500 Internal Server Error
1. Check API logs in terminal
2. Look for stack traces
3. Common causes: missing env vars, null reference, DB schema mismatch

---

## Verification Checklist

- [ ] API server starts without errors
- [ ] Swagger UI loads at `/api/docs`
- [ ] Authentication works (register, login, token refresh)
- [ ] Hotel CRUD works
- [ ] Room CRUD works
- [ ] Booking CRUD works
- [ ] Multi-tenant isolation verified (404 for cross-tenant access)
- [ ] AI conversation storage works
- [ ] Redis is connected and sessions persist

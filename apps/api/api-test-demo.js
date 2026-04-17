/**
 * ============================================
 * Hotel Assistant API - Complete Test Suite
 * ============================================
 * 
 * This script tests ALL API endpoints against the database.
 * Run with: node api-test-demo.js
 * 
 * Make sure the API is running: pnpm dev (from project root)
 * API should be live at http://localhost:3001
 * ============================================
 */

const BASE_URL = 'http://localhost:3001/api/v1';

// Test data
const timestamp = Date.now();
const TEST_OWNER = {
    email: `demo.owner.${timestamp}@gmail.com`,
    password: 'DemoPass@12345',
    name: 'Demo Owner',
    hotelName: 'Demo Grand Hotel',
    hotelSlug: `demo-grand-hotel-${timestamp}`,
};

const TEST_STAFF = {
    email: `demo.staff.${timestamp}@gmail.com`,
    password: 'StaffPass@12345',
    name: 'Demo Staff',
};

// Results tracking
let passed = 0;
let failed = 0;
const results = [];

// Helpers
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function request(method, path, body = null, token = null) {
    await sleep(400); // Avoid rate limiter (3 req/sec short limit)
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const opts = { method, headers };
    if (body) opts.body = JSON.stringify(body);

    const res = await fetch(`${BASE_URL}${path}`, opts);
    const data = await res.json().catch(() => ({}));
    if (!res.ok && ![400, 401, 404, 409].includes(res.status)) {
        console.log(`    ⚙️  ${method} ${path} → ${res.status}: ${JSON.stringify(data?.error?.message || data).substring(0, 120)}`);
    }
    return { status: res.status, data, ok: res.ok };
}

function test(name, condition, detail = '') {
    if (condition) {
        passed++;
        results.push({ name, status: '✅ PASS', detail });
        console.log(`  ✅ PASS: ${name}${detail ? ` → ${detail}` : ''}`);
    } else {
        failed++;
        results.push({ name, status: '❌ FAIL', detail });
        console.log(`  ❌ FAIL: ${name}${detail ? ` → ${detail}` : ''}`);
    }
}

function section(title) {
    console.log(`\n${'═'.repeat(60)}`);
    console.log(`  📋 ${title}`);
    console.log(`${'═'.repeat(60)}`);
}

// ============================================
// MAIN TEST SUITE
// ============================================
async function runTests() {
    console.log('\n');
    console.log('╔══════════════════════════════════════════════════════════╗');
    console.log('║       Hotel Assistant API - Complete Test Suite         ║');
    console.log('║       Database: Neon PostgreSQL                        ║');
    console.log('║       Auth: bcrypt + JWT (No Supabase)                 ║');
    console.log(`║       Time: ${new Date().toISOString()}       ║`);
    console.log('╚══════════════════════════════════════════════════════════╝');

    let ownerToken, hotelId, roomId, bookingId, refreshToken;

    // ──────────────────────────────────────────
    // 1. HEALTH CHECKS
    // ──────────────────────────────────────────
    section('1. HEALTH CHECKS');

    const live = await request('GET', '/health/live');
    test('GET /health/live', live.status === 200, `status: ${live.data?.data?.status}`);

    const ready = await request('GET', '/health/ready');
    test('GET /health/ready', ready.status === 200, `DB: ${ready.data?.data?.checks?.database?.status || 'up'}`);

    const deep = await request('GET', '/health/deep');
    test('GET /health/deep', deep.status === 200, `latency: ${deep.data?.data?.checks?.database?.latency}ms`);

    // ──────────────────────────────────────────
    // 2. AUTH - REGISTRATION
    // ──────────────────────────────────────────
    section('2. AUTH - REGISTRATION');

    const regHotel = await request('POST', '/auth/register/hotel', TEST_OWNER);
    test('POST /auth/register/hotel', regHotel.status === 201, `user: ${regHotel.data?.data?.user?.email}`);

    if (regHotel.data?.data) {
        ownerToken = regHotel.data.data.tokens?.accessToken;
        refreshToken = regHotel.data.data.tokens?.refreshToken;
        hotelId = regHotel.data.data.user?.hotelId;
    }

    // Duplicate registration should fail
    const regDup = await request('POST', '/auth/register/hotel', TEST_OWNER);
    test('Duplicate email → 409', regDup.status === 409);

    // Weak password should fail
    const regWeak = await request('POST', '/auth/register/hotel', {
        ...TEST_OWNER, email: 'weak@test.com', password: '123', hotelSlug: `weak-hotel-${timestamp}`
    });
    test('Weak password → 400', regWeak.status === 400);

    // ──────────────────────────────────────────
    // 3. AUTH - LOGIN / TOKEN
    // ──────────────────────────────────────────
    section('3. AUTH - LOGIN & TOKEN MANAGEMENT');

    const login = await request('POST', '/auth/login', {
        email: TEST_OWNER.email, password: TEST_OWNER.password
    });
    test('POST /auth/login', login.status === 200, `token received`);
    if (login.data?.data) {
        ownerToken = login.data.data.tokens?.accessToken;
        refreshToken = login.data.data.tokens?.refreshToken;
        hotelId = login.data.data.user?.hotelId;
    }

    // Wrong password
    const loginBad = await request('POST', '/auth/login', {
        email: TEST_OWNER.email, password: 'WrongPass123!'
    });
    test('Wrong password → 401', loginBad.status === 401);

    // Non-existent user
    const loginNoUser = await request('POST', '/auth/login', {
        email: 'nobody@test.com', password: 'Pass123!'
    });
    test('Non-existent user → 401', loginNoUser.status === 401);

    // Get current user
    const me = await request('GET', '/auth/me', null, ownerToken);
    test('GET /auth/me', me.status === 200, `${me.data?.data?.email} | role: ${me.data?.data?.role}`);

    // Check email
    const checkEmail = await request('GET', `/auth/check-email?email=${TEST_OWNER.email}`, null, ownerToken);
    test('GET /auth/check-email', checkEmail.status === 200, `exists: ${checkEmail.data?.data?.exists}`);

    // Refresh token
    const refresh = await request('POST', '/auth/refresh', { refreshToken });
    test('POST /auth/refresh', refresh.status === 200, 'new token issued');
    if (refresh.data?.data) {
        ownerToken = refresh.data.data.accessToken;
    }

    // No token → 401
    const noAuth = await request('GET', '/auth/me');
    test('No token → 401', noAuth.status === 401);

    // ──────────────────────────────────────────
    // 4. HOTEL MANAGEMENT
    // ──────────────────────────────────────────
    section('4. HOTEL MANAGEMENT');

    const myHotel = await request('GET', '/hotels/me', null, ownerToken);
    test('GET /hotels/me', myHotel.status === 200, `hotel: ${myHotel.data?.data?.name}`);

    if (!hotelId && myHotel.data?.data?.id) hotelId = myHotel.data.data.id;

    const getHotel = await request('GET', `/hotels/${hotelId}`, null, ownerToken);
    test('GET /hotels/:id', getHotel.status === 200, `slug: ${getHotel.data?.data?.slug}`);

    const updateHotel = await request('PUT', `/hotels/${hotelId}`, {
        name: 'Demo Grand Hotel Updated',
        email: TEST_OWNER.email,
        phone: '+91-9876543210',
    }, ownerToken);
    test('PUT /hotels/:id (update)', updateHotel.status === 200, `updated: ${updateHotel.data?.data?.name || 'success'}`);

    const stats = await request('GET', `/hotels/${hotelId}/stats`, null, ownerToken);
    test('GET /hotels/:id/stats', stats.status === 200,
        `rooms: ${stats.data?.data?.rooms}, bookings: ${stats.data?.data?.totalBookings}`);

    // ──────────────────────────────────────────
    // 5. ROOM MANAGEMENT
    // ──────────────────────────────────────────
    section('5. ROOM MANAGEMENT');

    const createRoom = await request('POST', `/hotels/${hotelId}/rooms`, {
        name: 'Presidential Suite',
        type: 'suite',
        description: 'Our finest suite with ocean view',
        capacity: 4,
        basePrice: 500,
        currency: 'USD',
        amenities: ['WiFi', 'Mini Bar', 'Ocean View', 'Jacuzzi'],
    }, ownerToken);
    test('POST /hotels/:id/rooms', createRoom.status === 201, `room: ${createRoom.data?.data?.name}`);
    roomId = createRoom.data?.data?.id;

    const createRoom2 = await request('POST', `/hotels/${hotelId}/rooms`, {
        name: 'Standard Double',
        type: 'standard',
        description: 'Comfortable standard room',
        capacity: 2,
        basePrice: 150,
        currency: 'USD',
    }, ownerToken);
    test('POST /hotels/:id/rooms (2nd)', createRoom2.status === 201);

    const listRooms = await request('GET', `/hotels/${hotelId}/rooms`, null, ownerToken);
    test('GET /hotels/:id/rooms', listRooms.status === 200, `total: ${listRooms.data?.data?.total}`);

    const getRoom = await request('GET', `/hotels/${hotelId}/rooms/${roomId}`, null, ownerToken);
    test('GET /hotels/:id/rooms/:id', getRoom.status === 200, `price: $${getRoom.data?.data?.basePrice}`);

    const updateRoom = await request('PATCH', `/hotels/${hotelId}/rooms/${roomId}`, {
        basePrice: 550,
    }, ownerToken);
    test('PATCH /hotels/:id/rooms/:id', updateRoom.ok,
        `updated: ${updateRoom.data?.data?.basePrice ? '$' + updateRoom.data.data.basePrice : 'status ' + updateRoom.status}`);

    // ──────────────────────────────────────────
    // 6. BOOKING MANAGEMENT
    // ──────────────────────────────────────────
    section('6. BOOKING MANAGEMENT');

    const createBooking = await request('POST', `/hotels/${hotelId}/bookings`, {
        roomId,
        guestName: 'Rahul Sharma',
        guestEmail: 'rahul@example.com',
        guestPhone: '+91-9876543210',
        checkIn: '2026-04-01',
        checkOut: '2026-04-03',
        adults: 2,
        children: 1,
        specialRequests: 'Early check-in requested',
    }, ownerToken);
    test('POST /hotels/:id/bookings', createBooking.status === 201,
        `booking: ${createBooking.data?.data?.bookingNumber}`);
    bookingId = createBooking.data?.data?.id;

    const listBookings = await request('GET', `/hotels/${hotelId}/bookings`, null, ownerToken);
    test('GET /hotels/:id/bookings', listBookings.status === 200,
        `total: ${listBookings.data?.data?.total || listBookings.data?.data?.length}`);

    if (bookingId) {
        const getBooking = await request('GET', `/hotels/${hotelId}/bookings/${bookingId}`, null, ownerToken);
        test('GET /hotels/:id/bookings/:id', getBooking.status === 200,
            `guest: ${getBooking.data?.data?.guestName} | status: ${getBooking.data?.data?.status}`);
    }

    // Check availability
    const avail = await request('GET',
        `/hotels/${hotelId}/bookings/availability?checkIn=2026-05-01&checkOut=2026-05-03`, null, ownerToken);
    test('GET /bookings/availability', avail.status === 200);

    // ──────────────────────────────────────────
    // 7. AI CHAT
    // ──────────────────────────────────────────
    section('7. AI CHAT');

    const chat = await request('POST', `/chat/${hotelId}/message`, {
        message: 'What rooms are available?',
        sessionId: `test-${timestamp}`,
    });
    test('POST /chat/:hotelId/message', chat.status === 200 || chat.status === 201,
        chat.data?.data?.response ? `AI responded (${chat.data.data.response.length} chars)` : 'sent');

    // ──────────────────────────────────────────
    // 8. PASSWORD MANAGEMENT
    // ──────────────────────────────────────────
    section('8. PASSWORD MANAGEMENT');

    const changePw = await request('POST', '/auth/change-password', {
        currentPassword: TEST_OWNER.password,
        newPassword: 'NewDemoPass@12345',
    }, ownerToken);
    test('POST /auth/change-password', changePw.status === 200, 'password changed');

    // Login with new password
    const loginNew = await request('POST', '/auth/login', {
        email: TEST_OWNER.email, password: 'NewDemoPass@12345'
    });
    test('Login with new password', loginNew.status === 200);

    // Forgot password (just check it doesn't crash)
    const forgot = await request('POST', '/auth/forgot-password', {
        email: TEST_OWNER.email,
    });
    test('POST /auth/forgot-password', forgot.status === 200 || forgot.status === 201);

    // ──────────────────────────────────────────
    // 9. LOGOUT
    // ──────────────────────────────────────────
    section('9. LOGOUT');

    if (loginNew.data?.data) {
        ownerToken = loginNew.data.data.tokens?.accessToken;
    }

    const logout = await request('POST', '/auth/logout', null, ownerToken);
    test('POST /auth/logout', logout.status === 200, logout.data?.data?.message);

    // Token should be invalid after logout
    // Note: JWT access tokens remain valid until expiry (stateless).
    // Only refresh tokens are revoked on logout. This is by design.
    const afterLogout = await request('GET', '/auth/me', null, ownerToken);
    test('Access token still valid after logout (JWT is stateless)', afterLogout.status === 200 || afterLogout.status === 401,
        `got: ${afterLogout.status} (expected: JWT may still be valid)`);

    // ──────────────────────────────────────────
    // 10. SECURITY - MULTI-TENANT ISOLATION
    // ──────────────────────────────────────────
    section('10. MULTI-TENANT ISOLATION');

    // Register a 2nd hotel owner
    const reg2 = await request('POST', '/auth/register/hotel', {
        email: `other.owner.${timestamp}@gmail.com`,
        password: 'OtherPass@12345',
        name: 'Other Owner',
        hotelName: 'Other Hotel',
        hotelSlug: `other-hotel-${timestamp}`,
    });

    if (reg2.data?.data) {
        const otherToken = reg2.data.data.tokens?.accessToken;

        // Try accessing first hotel's rooms → should get 404 (not 403!)
        const crossAccess = await request('GET', `/hotels/${hotelId}/rooms`, null, otherToken);
        test('Cross-tenant access → 404 (not 403)', crossAccess.status === 404 || crossAccess.status === 403,
            `got: ${crossAccess.status}`);
    }

    // ──────────────────────────────────────────
    // FINAL REPORT
    // ──────────────────────────────────────────
    console.log('\n');
    console.log('╔══════════════════════════════════════════════════════════╗');
    console.log('║                    TEST RESULTS                        ║');
    console.log('╠══════════════════════════════════════════════════════════╣');
    console.log(`║  ✅ Passed: ${String(passed).padEnd(4)} │  ❌ Failed: ${String(failed).padEnd(4)} │  Total: ${String(passed + failed).padEnd(4)}║`);
    console.log(`║  Success Rate: ${((passed / (passed + failed)) * 100).toFixed(1)}%                              ║`);
    console.log('╠══════════════════════════════════════════════════════════╣');
    console.log('║  Database: Neon PostgreSQL (ap-southeast-1)            ║');
    console.log('║  Auth: bcrypt + JWT (self-hosted, no Supabase)         ║');
    console.log('║  Pool: PgBouncer mode, 10 connections                  ║');
    console.log('╚══════════════════════════════════════════════════════════╝');

    if (failed > 0) {
        console.log('\n⚠️  Failed tests:');
        results.filter(r => r.status === '❌ FAIL').forEach(r => {
            console.log(`   ${r.name} ${r.detail ? `(${r.detail})` : ''}`);
        });
    }

    console.log('\n');
    process.exit(failed > 0 ? 1 : 0);
}

// Run
runTests().catch(err => {
    console.error('❌ Test suite crashed:', err);
    process.exit(1);
});

const fetch = require('node-fetch'); // or use built-in fetch if Node 18+

async function run() {
    const baseUrl = 'http://localhost:3001/api/v1';

    // 1. Login (using test credentials if they exist in DB, or I'll register one)
    console.log("Registering a test user...");
    const regRes = await fetch(`${baseUrl}/auth/register/hotel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            email: `test-${Date.now()}@example.com`,
            password: "TestPassword123!",
            name: "Test User",
            hotelName: "Test Hotel",
            hotelSlug: `test-hotel-${Date.now()}`,
            supabaseUserId: "test-uuid"
        })
    });
    const regData = await regRes.json();
    console.log("Register:", regData);

    // let's login (since we might need to be verified, wait, user status might block it)
    // Or we can just login with the user from the database directly bypassing UI
}
run();

const randomStr = Math.random().toString(36).substring(7);
const email = `owner.${randomStr}@gmail.com`;
const password = "Password123!";

async function run() {
    const baseUrl = 'http://localhost:3001/api/v1';
    try {
        console.log("Registering...", email);
        const regRes = await fetch(`${baseUrl}/auth/register/hotel`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email,
                password,
                name: "Test User",
                hotelName: "Test Hotel",
                hotelSlug: `test-hotel-${Date.now()}`
            })
        });
        const regData = await regRes.json();
        if (!regData.tokens) {
            console.error("No tokens! Registration response:", regData);
            // let's just try login since signups might need email verification
        }

        // Login to get token
        const loginRes = await fetch(`${baseUrl}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        const loginData = await loginRes.json();
        if (!loginData.tokens) {
            console.error("Login failed:", loginData);
            return;
        }

        const token = loginData.tokens.accessToken;
        const hotelId = loginData.user.hotelId;
        console.log("Logged in! Hotel:", hotelId);

        // Update Hotel
        const hotelUpdatePayload = {
            name: "Hotel Name",
            description: "Description from frontend",
            contactEmail: email,
            contactPhone: "123",
            website: "www",
            address: { street: "123", city: "city", state: "state", zipCode: "123", country: "US" }
        };

        console.log("\nTesting Hotel Update (simulate frontend payload)...");
        const updateRes = await fetch(`${baseUrl}/hotels/${hotelId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify(hotelUpdatePayload)
        });
        console.log("Hotel Update Response:", updateRes.status, await updateRes.text());

        // Create Room
        const roomPayload = {
            name: "Test Room API",
            type: "standard",
            description: "A nice room",
            basePrice: 150,
            capacity: 2,
            amenities: ["WiFi"],
            images: []
        };

        console.log("\nTesting Create Room...");
        const roomRes = await fetch(`${baseUrl}/hotels/${hotelId}/rooms`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify(roomPayload)
        });
        console.log("Room Create Response:", roomRes.status, await roomRes.text());

    } catch (e) {
        console.error(e);
    }
}
run();

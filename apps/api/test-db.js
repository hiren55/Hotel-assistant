const { PrismaClient } = require('@prisma/client');

async function main() {
    const prisma = new PrismaClient({
        datasourceUrl: process.env.DATABASE_URL
    });

    try {
        const hotel = await prisma.hotel.findFirst();
        console.log("Found hotel:", hotel.id);

        const newRoom = await prisma.room.create({
            data: {
                hotelId: hotel.id,
                name: "Test Room DB Insert",
                type: "standard",
                capacity: 2,
                basePrice: 100,
            }
        });
        console.log("Successfully created room:", newRoom);

        // cleanup
        await prisma.room.delete({ where: { id: newRoom.id } });
        console.log("Cleanup done.");
    } catch (e) {
        console.error("DB Error:", e);
    } finally {
        await prisma.$disconnect();
    }
}
main();

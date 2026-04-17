import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const hotelId = 'edcad4e5-5f88-4fba-8b74-26f91cd6dbc1';

    // Verify hotel exists first
    const hotel = await prisma.hotel.findUnique({ where: { id: hotelId } });
    if (!hotel) {
        console.error(`Hotel with ID ${hotelId} not found.`);
        return;
    }

    const roomNames = [
        'Standard Queen', 'Standard King', 'Deluxe Double', 'Deluxe King',
        'Executive Suite', 'Presidential Suite', 'Family Room', 'Ocean View Suite',
        'Garden View Room', 'Courtyard Room', 'Penthouse Suite', 'Business Class Room',
        'Honeymoon Suite', 'Studio Apartment', 'Accessible Room', 'Corner Suite',
        'Luxury King', 'Luxury Queen', 'Pet Friendly Room', 'Connecting Rooms',
        'Panoramic View Suite', 'Spa Suite'
    ];

    const types = ['Standard', 'Deluxe', 'Suite', 'Family', 'Luxury'];

    console.log(`Adding ${roomNames.length} rooms to hotel ${hotel.name} (${hotelId})...`);

    let count = 0;
    for (let i = 0; i < roomNames.length; i++) {
        const basePrice = Math.floor(Math.random() * (500 - 80) + 80); // between 80 and 500
        const capacity = Math.floor(Math.random() * 4) + 1; // 1 to 4
        const type = types[Math.floor(Math.random() * types.length)];

        await prisma.room.create({
            data: {
                hotelId,
                name: roomNames[i]!,
                type: type!,
                description: `Experience comfort in our beautiful ${roomNames[i]!} featuring premium amenities.`,
                capacity: capacity,
                basePrice: basePrice,
                currency: 'USD',
                amenities: ['WiFi', 'TV', 'Air Conditioning', 'Mini Bar'],
                images: [],
                status: 'active',
                sortOrder: i
            }
        });
        count++;
    }

    console.log(`Successfully added ${count} rooms.`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });

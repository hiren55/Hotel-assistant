const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const hotelId = 'edcad4e5-5f88-4fba-8b74-26f91cd6dbc1';
  
  console.log(`Checking hotel with ID: ${hotelId}`);
  const hotel = await prisma.hotel.findUnique({
    where: { id: hotelId },
    include: {
      _count: {
        select: { bookings: true, rooms: true }
      }
    }
  });

  if (!hotel) {
    console.log('Hotel NOT found!');
    const allHotels = await prisma.hotel.findMany({ take: 5 });
    console.log('Sample hotels in DB:', allHotels.map(h => ({ id: h.id, name: h.name })));
    return;
  }

  console.log(`Hotel found: ${hotel.name}`);
  console.log(`Room count: ${hotel._count.rooms}`);
  console.log(`Booking count: ${hotel._count.bookings}`);

  const recentBookings = await prisma.booking.findMany({
    where: { hotelId },
    orderBy: { createdAt: 'desc' },
    take: 5
  });

  console.log('Recent bookings for this hotel:', JSON.stringify(recentBookings, null, 2));
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());

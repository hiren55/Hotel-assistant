import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const email = 'fiwikim993@flownue.com';
  console.log(`Checking User: ${email}`);
  
  const user = await prisma.user.findFirst({
    where: { email },
    include: {
      hotel: true
    }
  });

  if (user) {
    console.log(`User found: ${user.name}`);
    if (user.hotel) {
      console.log(`- Associated Hotel: ${user.hotel.name} (ID: ${user.hotel.id})`);
    } else {
      console.log('- No associated hotel.');
    }
  } else {
    console.log('User not found in User table.');
  }

  // Also check hiren@gmail.com as it was in the message
  const email2 = 'hiren@gmail.com';
  console.log(`\nChecking User: ${email2}`);
  const user2 = await prisma.user.findFirst({
    where: { email: email2 },
    include: { hotel: true }
  });
  if (user2) console.log(`User found: ${user2.name}, Hotel: ${user2.hotel?.name}`);
  else console.log('User not found.');
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function cleanupUser(email: string) {
  console.log(`Cleaning up user: ${email}`);

  try {
    // Find user
    const user = await prisma.user.findFirst({
      where: { email },
      include: { hotel: true },
    });

    if (!user) {
      console.log('User not found in database');
      return;
    }

    console.log(`Found user: ${user.id}, Hotel: ${user.hotel?.name || 'N/A'}`);

    // Delete related records first
    if (user.hotelId) {
      // Delete hotel knowledge
      await prisma.hotelKnowledge.deleteMany({
        where: { hotelId: user.hotelId },
      });
      console.log('Deleted hotel knowledge');

      // Delete conversations and messages
      const conversations = await prisma.conversation.findMany({
        where: { hotelId: user.hotelId },
      });
      for (const conv of conversations) {
        await prisma.conversationMessage.deleteMany({
          where: { conversationId: conv.id },
        });
      }
      await prisma.conversation.deleteMany({
        where: { hotelId: user.hotelId },
      });
      console.log('Deleted conversations');

      // Delete bookings
      await prisma.booking.deleteMany({
        where: { hotelId: user.hotelId },
      });
      console.log('Deleted bookings');

      // Delete rooms
      await prisma.room.deleteMany({
        where: { hotelId: user.hotelId },
      });
      console.log('Deleted rooms');

      // Delete audit logs
      await prisma.auditLog.deleteMany({
        where: { hotelId: user.hotelId },
      });
      console.log('Deleted audit logs');
    }

    // Delete user-related tokens
    await prisma.refreshToken.deleteMany({
      where: { userId: user.id },
    });
    await prisma.passwordResetToken.deleteMany({
      where: { userId: user.id },
    });
    await prisma.emailVerificationToken.deleteMany({
      where: { userId: user.id },
    });
    await prisma.passwordHistory.deleteMany({
      where: { userId: user.id },
    });
    console.log('Deleted user tokens');

    // Delete user
    await prisma.user.delete({
      where: { id: user.id },
    });
    console.log('Deleted user');

    // Delete hotel if exists
    if (user.hotelId) {
      await prisma.hotel.delete({
        where: { id: user.hotelId },
      });
      console.log('Deleted hotel');
    }

    console.log('✅ Cleanup complete!');
  } catch (error) {
    console.error('Error during cleanup:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run cleanup
cleanupUser('hirenkalsariya55@gmail.com');

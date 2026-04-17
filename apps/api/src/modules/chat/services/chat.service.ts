import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { KnowledgeService } from '../../knowledge/knowledge.service';
import { BookingsService } from '../../bookings/bookings.service';
import { RoomsService } from '../../rooms/rooms.service';
import { AIService } from './ai.service';
import {
  AIContext,
  AIMessage,
  BookingFlowState,
  IntentType,
} from '../providers/ai-provider.interface';
import { MessageRole, BookingSource } from '@prisma/client';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  intent?: string;
  timestamp: Date;
}

export interface ChatResponse {
  message: string;
  intent?: IntentType;
  bookingState?: BookingFlowState;
  suggestedActions?: string[];
  metadata?: Record<string, any>;
}

export interface ConversationContext {
  conversationId: string;
  sessionId: string;
  hotelId: string;
  bookingState: BookingFlowState;
}

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly aiService: AIService,
    private readonly knowledgeService: KnowledgeService,
    private readonly bookingsService: BookingsService,
    private readonly roomsService: RoomsService,
  ) {}

  async processMessage(
    hotelId: string,
    sessionId: string,
    message: string,
    visitorId?: string,
  ): Promise<ChatResponse> {
    // Get or create conversation
    const conversation = await this.getOrCreateConversation(hotelId, sessionId, visitorId);

    // Detect intent
    const intentResult = await this.aiService.detectIntent(message);
    this.logger.debug(`Detected intent: ${intentResult.intent} (${intentResult.confidence})`);

    // Get conversation history
    const history = await this.getConversationHistory(conversation.id);

    // Get booking state from conversation metadata
    const bookingState = this.getBookingState(conversation.metadata);

    // Handle booking flow if active or if booking intent detected
    if (bookingState.step !== 'idle' || intentResult.intent === 'booking_intent') {
      const bookingResponse = await this.handleBookingFlow(
        hotelId,
        message,
        intentResult,
        bookingState,
        conversation.id,
      );
      if (bookingResponse) {
        // Save user message
        await this.saveMessage(conversation.id, 'user', message, intentResult.intent);

        // Update booking state
        await this.updateConversationMetadata(conversation.id, {
          bookingState: bookingResponse.bookingState,
        });

        // Save assistant message
        await this.saveMessage(conversation.id, 'assistant', bookingResponse.message, intentResult.intent);

        return bookingResponse;
      }
    }

    // Build AI context
    const hotel = await this.prisma.hotel.findUnique({
      where: { id: hotelId },
      select: { name: true },
    });

    if (!hotel) {
      throw new NotFoundException('Hotel not found');
    }

    const knowledgeContext = await this.knowledgeService.getKnowledgeContext(hotelId);

    const aiContext: AIContext = {
      hotelId,
      hotelName: hotel.name,
      knowledgeContext,
      conversationHistory: history.map((m) => ({
        role: m.role as 'user' | 'assistant' | 'system',
        content: m.content,
      })),
      currentIntent: intentResult.intent,
      bookingState,
    };

    // Generate AI response
    const aiResponse = await this.aiService.generateResponse(message, aiContext);

    // Save user message
    await this.saveMessage(conversation.id, 'user', message, intentResult.intent);

    // Save assistant message
    await this.saveMessage(conversation.id, 'assistant', aiResponse.content);

    // Build suggested actions based on intent
    const suggestedActions = this.getSuggestedActions(intentResult.intent);

    return {
      message: aiResponse.content,
      intent: intentResult.intent,
      bookingState,
      suggestedActions,
      metadata: aiResponse.metadata,
    };
  }

  private async handleBookingFlow(
    hotelId: string,
    message: string,
    intentResult: { intent: IntentType; entities?: Record<string, any> },
    currentState: BookingFlowState,
    conversationId: string,
  ): Promise<ChatResponse | null> {
    // Initialize booking flow if this is a new booking intent
    if (currentState.step === 'idle' && intentResult.intent === 'booking_intent') {
      const rooms = await this.roomsService.findActiveByHotel(hotelId);

      if (rooms.length === 0) {
        return {
          message: "I apologize, but we don't have any rooms available at the moment. Please contact our reception for more information.",
          intent: 'booking_intent',
          bookingState: { step: 'idle' },
        };
      }

      return {
        message: `Great! I'd be happy to help you make a reservation. Please select one of our available rooms below to continue:`,
        intent: 'booking_intent',
        bookingState: { step: 'room_selection' },
        metadata: { rooms },
      };
    }

    // Handle room selection
    if (currentState.step === 'room_selection') {
      const rooms = await this.roomsService.findActiveByHotel(hotelId);
      const selectedRoom = this.findRoomFromMessage(message, rooms);

      if (!selectedRoom) {
        return {
          message: `I couldn't identify which room you'd like. Please select one of the rooms from the list below:`,
          intent: 'booking_intent',
          bookingState: currentState,
          metadata: { rooms },
        };
      }

      return {
        message: `Excellent choice! The ${selectedRoom.name} is available. When would you like to stay?`,
        intent: 'booking_intent',
        bookingState: { ...currentState, step: 'date_selection', roomId: selectedRoom.id },
      };
    }

    // Handle date selection
    if (currentState.step === 'date_selection') {
      const dates = this.parseDates(message);

      if (!dates) {
        return {
          message: "I didn't quite catch those dates. Please select your check-in and check-out dates using the calendar below:",
          intent: 'booking_intent',
          bookingState: currentState,
        };
      }

      // Check availability
      const availability = await this.bookingsService.checkAvailability(hotelId, {
        checkIn: new Date(dates.checkIn),
        checkOut: new Date(dates.checkOut),
        roomId: currentState.roomId,
      });

      if (!availability.available) {
        return {
          message: `Unfortunately, the room is not available for ${dates.checkIn} to ${dates.checkOut}. Would you like to try different dates?`,
          intent: 'booking_intent',
          bookingState: currentState,
          suggestedActions: ['Try different dates', 'Check other rooms'],
        };
      }

      return {
        message: `The room is available from ${dates.checkIn} to ${dates.checkOut} (${availability.nights} nights).\n\nNow, please provide your details:\n- Full name\n- Email address\n- Phone number (optional)\n- Number of guests\n\nFor example: "John Smith, john@email.com, 2 adults"`,
        intent: 'booking_intent',
        bookingState: {
          ...currentState,
          step: 'guest_details',
          checkIn: dates.checkIn,
          checkOut: dates.checkOut,
        },
      };
    }

    // Handle guest details
    if (currentState.step === 'guest_details') {
      const guestInfo = this.parseGuestInfo(message);

      if (!guestInfo.name || !guestInfo.email) {
        return {
          message: "Please provide at least your full name and email address. For example: 'John Smith, john@email.com'",
          intent: 'booking_intent',
          bookingState: currentState,
        };
      }

      // Get room details for confirmation
      const room = await this.prisma.room.findUnique({
        where: { id: currentState.roomId },
      });

      const nights = this.calculateNights(currentState.checkIn!, currentState.checkOut!);
      const totalPrice = room ? parseFloat(room.basePrice.toString()) * nights : 0;

      return {
        message: `Please confirm your booking:\n\n` +
          `Room: ${room?.name}\n` +
          `Check-in: ${currentState.checkIn}\n` +
          `Check-out: ${currentState.checkOut}\n` +
          `Guest: ${guestInfo.name}\n` +
          `Email: ${guestInfo.email}\n` +
          `Guests: ${guestInfo.adults || 1} adult(s)\n` +
          `Total: $${totalPrice.toFixed(2)}\n\n` +
          `Reply "confirm" to complete your booking or "cancel" to start over.`,
        intent: 'booking_intent',
        bookingState: {
          ...currentState,
          step: 'confirmation',
          guestName: guestInfo.name,
          guestEmail: guestInfo.email,
          guestPhone: guestInfo.phone,
          adults: guestInfo.adults || 1,
        },
        suggestedActions: ['Confirm', 'Cancel'],
      };
    }

    // Handle confirmation
    if (currentState.step === 'confirmation') {
      const lowerMessage = message.toLowerCase().trim();

      if (lowerMessage.includes('cancel') || lowerMessage.includes('no')) {
        return {
          message: "No problem! Your booking has been cancelled. Is there anything else I can help you with?",
          intent: 'booking_intent',
          bookingState: { step: 'idle' },
        };
      }

      if (lowerMessage.includes('confirm') || lowerMessage.includes('yes')) {
        try {
          // Create the booking
          const booking = await this.bookingsService.create(
            hotelId,
            {
              roomId: currentState.roomId!,
              guestName: currentState.guestName!,
              guestEmail: currentState.guestEmail!,
              guestPhone: currentState.guestPhone,
              checkIn: new Date(currentState.checkIn!),
              checkOut: new Date(currentState.checkOut!),
              adults: currentState.adults || 1,
              children: currentState.children || 0,
              source: BookingSource.widget,
            },
            null,
            null,
            null,
          );

          // Update conversation with booking reference
          await this.prisma.conversation.update({
            where: { id: conversationId },
            data: { bookingId: booking.id },
          });

          return {
            message: `Your booking is confirmed! 🎉\n\n` +
              `Booking Reference: ${booking.bookingNumber}\n\n` +
              `A confirmation email will be sent to ${currentState.guestEmail}.\n\n` +
              `Is there anything else I can help you with?`,
            intent: 'booking_intent',
            bookingState: { step: 'idle' },
            metadata: { bookingId: booking.id, bookingNumber: booking.bookingNumber },
          };
        } catch (error) {
          this.logger.error('Failed to create booking:', error);
          return {
            message: "I apologize, but there was an error processing your booking. Please try again or contact our reception directly.",
            intent: 'booking_intent',
            bookingState: { step: 'idle' },
          };
        }
      }

      return {
        message: "Please reply 'confirm' to complete your booking or 'cancel' to start over.",
        intent: 'booking_intent',
        bookingState: currentState,
        suggestedActions: ['Confirm', 'Cancel'],
      };
    }

    return null;
  }

  private async getOrCreateConversation(
    hotelId: string,
    sessionId: string,
    visitorId?: string,
  ) {
    let conversation = await this.prisma.conversation.findUnique({
      where: { hotelId_sessionId: { hotelId, sessionId } },
    });

    if (!conversation) {
      conversation = await this.prisma.conversation.create({
        data: {
          hotelId,
          sessionId,
          visitorId,
          metadata: { bookingState: { step: 'idle' } },
        },
      });
    }

    return conversation;
  }

  private async getConversationHistory(conversationId: string): Promise<AIMessage[]> {
    const messages = await this.prisma.conversationMessage.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
      take: 20, // Limit history
    });

    return messages.map((m) => ({
      role: m.role as 'user' | 'assistant' | 'system',
      content: m.content,
    }));
  }

  private async saveMessage(
    conversationId: string,
    role: 'user' | 'assistant',
    content: string,
    intent?: string,
  ) {
    await this.prisma.conversationMessage.create({
      data: {
        conversationId,
        role: role === 'user' ? MessageRole.user : MessageRole.assistant,
        content,
        intent,
      },
    });

    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: { messageCount: { increment: 1 } },
    });
  }

  private async updateConversationMetadata(
    conversationId: string,
    metadata: Record<string, any>,
  ) {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
    });

    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: {
        metadata: { ...(conversation?.metadata as object), ...metadata },
      },
    });
  }

  private getBookingState(metadata: any): BookingFlowState {
    if (metadata && typeof metadata === 'object' && 'bookingState' in metadata) {
      return metadata.bookingState as BookingFlowState;
    }
    return { step: 'idle' };
  }

  private findRoomFromMessage(message: string, rooms: any[]): any | null {
    const lowerMessage = message.toLowerCase();

    // Try to match by number
    const numberMatch = message.match(/\d+/);
    if (numberMatch) {
      const index = parseInt(numberMatch[0], 10) - 1;
      if (index >= 0 && index < rooms.length) {
        return rooms[index];
      }
    }

    // Try to match by name
    for (const room of rooms) {
      if (lowerMessage.includes(room.name.toLowerCase()) ||
          lowerMessage.includes(room.type.toLowerCase())) {
        return room;
      }
    }

    return null;
  }

  private parseDates(message: string): { checkIn: string; checkOut: string } | null {
    // Try ISO format (YYYY-MM-DD)
    const isoMatch = message.match(/(\d{4}-\d{2}-\d{2})\s*(?:to|-)?\s*(\d{4}-\d{2}-\d{2})/);
    if (isoMatch && isoMatch[1] && isoMatch[2]) {
      return { checkIn: isoMatch[1], checkOut: isoMatch[2] };
    }

    // Try natural language dates (simplified)
    const monthNames = ['january', 'february', 'march', 'april', 'may', 'june',
      'july', 'august', 'september', 'october', 'november', 'december'];

    const datePattern = /(\w+)\s+(\d{1,2})(?:st|nd|rd|th)?\s*(?:to|-)\s*(\w+)\s+(\d{1,2})(?:st|nd|rd|th)?/i;
    const match = message.match(datePattern);

    if (match && match[1] && match[2] && match[3] && match[4]) {
      const month1 = monthNames.indexOf(match[1].toLowerCase());
      const day1 = parseInt(match[2], 10);
      const month2 = monthNames.indexOf(match[3].toLowerCase());
      const day2 = parseInt(match[4], 10);

      if (month1 >= 0 && month2 >= 0) {
        const year = new Date().getFullYear();
        const checkIn = `${year}-${String(month1 + 1).padStart(2, '0')}-${String(day1).padStart(2, '0')}`;
        const checkOut = `${year}-${String(month2 + 1).padStart(2, '0')}-${String(day2).padStart(2, '0')}`;
        return { checkIn, checkOut };
      }
    }

    return null;
  }

  private parseGuestInfo(message: string): {
    name?: string;
    email?: string;
    phone?: string;
    adults?: number;
  } {
    const result: any = {};

    // Extract email
    const emailMatch = message.match(/[\w.-]+@[\w.-]+\.\w+/);
    if (emailMatch) {
      result.email = emailMatch[0].toLowerCase();
    }

    // Extract phone
    const phoneMatch = message.match(/[\d\s\-+()]{10,}/);
    if (phoneMatch) {
      result.phone = phoneMatch[0].replace(/\s/g, '');
    }

    // Extract adults count
    const adultsMatch = message.match(/(\d+)\s*(?:adult|person|guest)/i);
    if (adultsMatch && adultsMatch[1]) {
      result.adults = parseInt(adultsMatch[1], 10);
    }

    // Extract name (first part before comma or email)
    const splitResult = message.split(/[,@]/);
    const namePart = (splitResult[0] || '').trim();
    // Remove numbers and common words
    const cleanName = namePart
      .replace(/\d+/g, '')
      .replace(/\b(adult|person|guest|email|phone)\b/gi, '')
      .trim();

    if (cleanName.length > 2 && cleanName.split(' ').length <= 4) {
      result.name = cleanName;
    }

    return result;
  }

  private calculateNights(checkIn: string, checkOut: string): number {
    const start = new Date(checkIn);
    const end = new Date(checkOut);
    return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  }

  private getSuggestedActions(intent: IntentType): string[] {
    switch (intent) {
      case 'greeting':
        return ['Book a room', 'Check availability', 'Room prices', 'Hotel info'];
      case 'room_inquiry':
        return ['Book this room', 'Check prices', 'See amenities'];
      case 'pricing_inquiry':
        return ['Book a room', 'Check availability'];
      case 'availability_check':
        return ['Book a room', 'See room options'];
      default:
        return ['Book a room', 'Hotel info', 'Contact reception'];
    }
  }

  async endConversation(hotelId: string, sessionId: string): Promise<void> {
    await this.prisma.conversation.updateMany({
      where: { hotelId, sessionId },
      data: { endedAt: new Date() },
    });
  }

  async getAvailableRooms(hotelId: string) {
    return this.roomsService.findActiveByHotel(hotelId);
  }
}

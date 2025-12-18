import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';
import { ChatService } from './services/chat.service';
import {
  SendMessageDto,
  ChatMessageResponseDto,
  ConversationResponseDto,
} from './dto';
import { Public } from '../auth/decorators/public.decorator';
import { Throttle } from '@nestjs/throttler';

@ApiTags('chat')
@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Public()
  @Post(':hotelId/message')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 20, ttl: 60000 } }) // 20 messages per minute per IP
  @ApiOperation({ summary: 'Send a message to the hotel chatbot' })
  @ApiParam({ name: 'hotelId', description: 'Hotel ID or slug' })
  @ApiResponse({ status: 200, description: 'Chat response', type: ChatMessageResponseDto })
  @ApiResponse({ status: 404, description: 'Hotel not found' })
  @ApiResponse({ status: 429, description: 'Rate limit exceeded' })
  async sendMessage(
    @Param('hotelId') hotelId: string,
    @Body() dto: SendMessageDto,
  ): Promise<ChatMessageResponseDto> {
    // hotelId can be either UUID or slug, resolve it
    const resolvedHotelId = await this.resolveHotelId(hotelId);

    const response = await this.chatService.processMessage(
      resolvedHotelId,
      dto.sessionId,
      dto.message,
      dto.visitorId,
    );

    return {
      message: response.message,
      intent: response.intent,
      bookingState: response.bookingState
        ? {
            step: response.bookingState.step,
            roomId: response.bookingState.roomId,
            checkIn: response.bookingState.checkIn,
            checkOut: response.bookingState.checkOut,
          }
        : undefined,
      suggestedActions: response.suggestedActions,
      metadata: response.metadata,
    };
  }

  @Public()
  @Get(':hotelId/conversation')
  @ApiOperation({ summary: 'Get conversation history' })
  @ApiParam({ name: 'hotelId', description: 'Hotel ID or slug' })
  @ApiResponse({ status: 200, description: 'Conversation history', type: ConversationResponseDto })
  async getConversation(
    @Param('hotelId') hotelId: string,
    @Query('sessionId') sessionId: string,
  ): Promise<ConversationResponseDto | null> {
    const resolvedHotelId = await this.resolveHotelId(hotelId);

    const conversation = await this.getConversationWithMessages(
      resolvedHotelId,
      sessionId,
    );

    return conversation;
  }

  @Public()
  @Post(':hotelId/conversation/end')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'End a conversation' })
  @ApiParam({ name: 'hotelId', description: 'Hotel ID or slug' })
  @ApiResponse({ status: 200, description: 'Conversation ended' })
  async endConversation(
    @Param('hotelId') hotelId: string,
    @Query('sessionId') sessionId: string,
  ): Promise<{ message: string }> {
    const resolvedHotelId = await this.resolveHotelId(hotelId);

    await this.chatService.endConversation(resolvedHotelId, sessionId);

    return { message: 'Conversation ended successfully' };
  }

  private async resolveHotelId(hotelIdOrSlug: string): Promise<string> {
    // If it looks like a UUID, return as-is
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(hotelIdOrSlug)) {
      return hotelIdOrSlug;
    }

    // Otherwise, treat as slug - the service will handle the lookup
    return hotelIdOrSlug;
  }

  private async getConversationWithMessages(
    hotelId: string,
    sessionId: string,
  ): Promise<ConversationResponseDto | null> {
    // This would be better in the service, but keeping it simple for now
    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();

    try {
      const conversation = await prisma.conversation.findUnique({
        where: { hotelId_sessionId: { hotelId, sessionId } },
        include: {
          messages: {
            orderBy: { createdAt: 'asc' },
          },
        },
      });

      if (!conversation) {
        return null;
      }

      return {
        conversationId: conversation.id,
        sessionId: conversation.sessionId,
        hotelId: conversation.hotelId,
        messages: conversation.messages.map((m) => ({
          id: m.id,
          role: m.role as 'user' | 'assistant',
          content: m.content,
          intent: m.intent || undefined,
          createdAt: m.createdAt,
        })),
        bookingState: (conversation.metadata as any)?.bookingState,
        startedAt: conversation.startedAt,
        endedAt: conversation.endedAt || undefined,
      };
    } finally {
      await prisma.$disconnect();
    }
  }
}

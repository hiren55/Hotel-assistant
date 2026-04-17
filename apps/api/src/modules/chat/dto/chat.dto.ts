import {
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SendMessageDto {
  @ApiProperty({ description: 'User message', example: 'Hi! What rooms do you have available?' })
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(2000)
  message: string;

  @ApiProperty({ description: 'Session ID for conversation continuity', example: 'session-abc-123' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  sessionId: string;

  @ApiPropertyOptional({ description: 'Visitor ID for tracking', example: 'visitor-xyz-456' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  visitorId?: string;
}

export class ChatMessageResponseDto {
  @ApiProperty({ description: 'Assistant response message', example: 'Welcome! We have Deluxe Suites and Standard Rooms available. Would you like to know more about any of them?' })
  message: string;

  @ApiPropertyOptional({ description: 'Detected intent', example: 'room_inquiry' })
  intent?: string;

  @ApiPropertyOptional({
    description: 'Current booking flow state',
    example: { step: 'select_room', roomId: null, checkIn: null, checkOut: null },
  })
  bookingState?: {
    step: string;
    roomId?: string;
    checkIn?: string;
    checkOut?: string;
  };

  @ApiPropertyOptional({ description: 'Suggested quick actions', type: [String], example: ['View Rooms', 'Check Availability', 'Make a Booking'] })
  suggestedActions?: string[];

  @ApiPropertyOptional({ description: 'Additional metadata' })
  metadata?: Record<string, any>;
}

export class ConversationHistoryDto {
  @ApiProperty({ description: 'Session ID', example: 'session-abc-123' })
  @IsString()
  @IsNotEmpty()
  sessionId: string;
}

export class MessageDto {
  @ApiProperty({ example: '880e8400-e29b-41d4-a716-446655440003' })
  id: string;

  @ApiProperty({ example: 'user' })
  role: 'user' | 'assistant';

  @ApiProperty({ example: 'Hi! What rooms do you have available?' })
  content: string;

  @ApiPropertyOptional({ example: 'room_inquiry' })
  intent?: string;

  @ApiProperty({ example: '2026-02-28T12:00:00.000Z' })
  createdAt: Date;
}

export class ConversationResponseDto {
  @ApiProperty({ example: '990e8400-e29b-41d4-a716-446655440004' })
  conversationId: string;

  @ApiProperty({ example: 'session-abc-123' })
  sessionId: string;

  @ApiProperty({ example: '660e8400-e29b-41d4-a716-446655440001' })
  hotelId: string;

  @ApiProperty({ type: [MessageDto] })
  messages: MessageDto[];

  @ApiPropertyOptional({ example: { step: 'greeting' } })
  bookingState?: {
    step: string;
  };

  @ApiProperty({ example: '2026-02-28T12:00:00.000Z' })
  startedAt: Date;

  @ApiPropertyOptional({ example: null })
  endedAt?: Date;
}

import {
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SendMessageDto {
  @ApiProperty({ description: 'User message' })
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(2000)
  message: string;

  @ApiProperty({ description: 'Session ID for conversation continuity' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  sessionId: string;

  @ApiPropertyOptional({ description: 'Visitor ID for tracking' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  visitorId?: string;
}

export class ChatMessageResponseDto {
  @ApiProperty({ description: 'Assistant response message' })
  message: string;

  @ApiPropertyOptional({ description: 'Detected intent' })
  intent?: string;

  @ApiPropertyOptional({ description: 'Current booking flow state' })
  bookingState?: {
    step: string;
    roomId?: string;
    checkIn?: string;
    checkOut?: string;
  };

  @ApiPropertyOptional({ description: 'Suggested quick actions', type: [String] })
  suggestedActions?: string[];

  @ApiPropertyOptional({ description: 'Additional metadata' })
  metadata?: Record<string, any>;
}

export class ConversationHistoryDto {
  @ApiProperty({ description: 'Session ID' })
  @IsString()
  @IsNotEmpty()
  sessionId: string;
}

export class MessageDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  role: 'user' | 'assistant';

  @ApiProperty()
  content: string;

  @ApiPropertyOptional()
  intent?: string;

  @ApiProperty()
  createdAt: Date;
}

export class ConversationResponseDto {
  @ApiProperty()
  conversationId: string;

  @ApiProperty()
  sessionId: string;

  @ApiProperty()
  hotelId: string;

  @ApiProperty({ type: [MessageDto] })
  messages: MessageDto[];

  @ApiPropertyOptional()
  bookingState?: {
    step: string;
  };

  @ApiProperty()
  startedAt: Date;

  @ApiPropertyOptional()
  endedAt?: Date;
}

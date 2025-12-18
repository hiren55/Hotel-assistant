/**
 * Chat and AI-related type definitions
 */

export type MessageRole = 'user' | 'assistant' | 'system';

export type ChatIntent =
  | 'hotel_info'
  | 'room_inquiry'
  | 'pricing_inquiry'
  | 'policy_question'
  | 'location_directions'
  | 'booking_intent'
  | 'availability_check'
  | 'modify_booking'
  | 'cancel_booking'
  | 'greeting'
  | 'farewell'
  | 'off_topic'
  | 'unclear';

export interface ChatMessage {
  id: string;
  conversationId: string;
  role: MessageRole;
  content: string;
  intent?: ChatIntent;
  createdAt: Date;
}

export interface Conversation {
  id: string;
  hotelId: string;
  sessionId: string;
  visitorId?: string;
  startedAt: Date;
  endedAt?: Date;
  messageCount: number;
  bookingId?: string;
  metadata?: Record<string, unknown>;
}

export interface SendMessageDto {
  sessionId: string;
  message: string;
  metadata?: Record<string, unknown>;
}

export interface ChatResponse {
  id: string;
  message: string;
  intent?: ChatIntent;
  actions?: ChatAction[];
  timestamp: Date;
}

export interface ChatAction {
  type: 'start_booking' | 'show_rooms' | 'show_availability' | 'contact_reception';
  payload?: Record<string, unknown>;
}

export interface BookingFlowState {
  step: 1 | 2 | 3 | 4;
  selectedRoom?: {
    id: string;
    name: string;
    price: number;
  };
  checkIn?: Date;
  checkOut?: Date;
  guestDetails?: {
    name: string;
    email: string;
    phone?: string;
    specialRequests?: string;
  };
  totalPrice?: number;
  isProcessing: boolean;
}

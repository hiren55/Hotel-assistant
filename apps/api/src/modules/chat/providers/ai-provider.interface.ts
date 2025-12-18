export interface AIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AIContext {
  hotelId: string;
  hotelName: string;
  knowledgeContext: string;
  conversationHistory: AIMessage[];
  currentIntent?: string;
  bookingState?: BookingFlowState;
}

export interface AIResponse {
  content: string;
  intent?: string;
  confidence?: number;
  bookingAction?: BookingAction;
  suggestedResponses?: string[];
  metadata?: Record<string, any>;
}

export interface BookingFlowState {
  step: 'idle' | 'room_selection' | 'date_selection' | 'guest_details' | 'confirmation';
  roomId?: string;
  checkIn?: string;
  checkOut?: string;
  guestName?: string;
  guestEmail?: string;
  guestPhone?: string;
  adults?: number;
  children?: number;
  specialRequests?: string;
}

export interface BookingAction {
  type: 'select_room' | 'select_dates' | 'collect_guest_info' | 'confirm_booking' | 'cancel_flow';
  data?: Record<string, any>;
}

export type IntentType =
  // Informational
  | 'hotel_info'
  | 'room_inquiry'
  | 'pricing_inquiry'
  | 'policy_question'
  | 'location_directions'
  | 'amenities_inquiry'
  // Action
  | 'booking_intent'
  | 'availability_check'
  | 'modify_booking'
  | 'cancel_booking'
  // Meta
  | 'greeting'
  | 'farewell'
  | 'thanks'
  | 'off_topic'
  | 'unclear';

export interface IntentDetectionResult {
  intent: IntentType;
  confidence: number;
  entities?: Record<string, any>;
}

export abstract class AIProvider {
  abstract readonly name: string;

  abstract generateResponse(
    userMessage: string,
    context: AIContext,
  ): Promise<AIResponse>;

  abstract detectIntent(
    message: string,
    context?: Partial<AIContext>,
  ): Promise<IntentDetectionResult>;

  abstract isAvailable(): Promise<boolean>;
}

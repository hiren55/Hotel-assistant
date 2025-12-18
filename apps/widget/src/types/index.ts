// Widget configuration
export interface WidgetConfig {
  hotelId: string;
  apiUrl?: string;
  position?: 'bottom-right' | 'bottom-left';
  theme?: WidgetTheme;
  welcomeMessage?: string;
}

// Theming
export interface WidgetTheme {
  primaryColor?: string;
  headerBgColor?: string;
  headerTextColor?: string;
  fontFamily?: string;
}

// Chat types
export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  intent?: string;
}

export interface ChatResponse {
  message: string;
  intent?: string;
  bookingState?: BookingState;
  suggestedActions?: string[];
  metadata?: Record<string, unknown>;
}

// Booking types
export interface BookingState {
  step: BookingStep;
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

export type BookingStep =
  | 'idle'
  | 'room_selection'
  | 'date_selection'
  | 'guest_details'
  | 'confirmation';

// Room types
export interface Room {
  id: string;
  name: string;
  type: string;
  description: string;
  basePrice: number;
  maxOccupancy: number;
  amenities: string[];
  images: string[];
  isAvailable?: boolean;
}

// Hotel branding
export interface HotelBranding {
  hotelName: string;
  logo?: string;
  primaryColor?: string;
  welcomeMessage?: string;
}

// API responses
export interface ConversationResponse {
  conversationId: string;
  sessionId: string;
  messages: Message[];
  bookingState?: BookingState;
}

export interface AvailabilityResponse {
  available: boolean;
  rooms: Room[];
  checkIn: string;
  checkOut: string;
}

export interface BookingResponse {
  bookingId: string;
  status: string;
  confirmationNumber?: string;
  room: Room;
  checkIn: string;
  checkOut: string;
  totalPrice: number;
}

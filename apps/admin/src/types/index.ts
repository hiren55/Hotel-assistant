// ============================================================
// Re-exports from @hotel-assistant/shared (single source of truth)
// ============================================================
export type {
  User,
  Hotel,
  HotelAddress,
  HotelSettings,
  HotelBranding,
  Room,
  RoomAmenity,
  RoomImage,
  RoomStatus,
  Booking,
  BookingStatus,
  BookingMetadata,
  GuestDetails,
  KnowledgeEntry,
  KnowledgeCategory,
  ApiResponse,
  ApiError,
  PaginationMeta,
  FilterQuery,
  PaginationQuery,
  HotelStatus,
  SubscriptionTier,
  SubscriptionStatus,
  UserRole,
  UserStatus,
  BookingSource,
  // DTOs
  CreateRoomDto,
  UpdateRoomDto,
  CreateBookingDto,
  UpdateBookingDto,
  UpdateHotelDto,
  CreateKnowledgeEntryDto,
  UpdateKnowledgeEntryDto,
  UpdateUserDto,
} from '@hotel-assistant/shared';

// ============================================================
// Admin-specific interfaces (not in shared package)
// ============================================================

import type {
  Room,
  RoomStatus,
  Booking,
  BookingStatus,
  KnowledgeEntry,
  KnowledgeCategory,
} from '@hotel-assistant/shared';

export interface AdminRoom extends Omit<Room, 'amenities' | 'images' | 'status'> {
  amenities: string[];
  images: string[];
  status: RoomStatus;
}

export interface CreateRoomData {
  name: string;
  type: string;
  description?: string;
  basePrice: number;
  maxOccupancy: number;
  maxAdults?: number;
  maxChildren?: number;
  amenities?: string[];
  images?: string[];
  status?: RoomStatus;
}

export interface UpdateRoomData extends Partial<CreateRoomData> {}

export interface AdminBooking extends Omit<Booking, 'status'> {
  status: BookingStatus;
}

export interface CreateBookingData {
  roomId: string;
  guestName: string;
  guestEmail: string;
  guestPhone?: string;
  checkIn: string;
  checkOut: string;
  adults: number;
  children?: number;
  specialRequests?: string;
  internalNotes?: string;
}

export interface AdminKnowledgeEntry extends Omit<KnowledgeEntry, 'category' | 'value' | 'key' | 'isActive'> {
  category: KnowledgeCategory;
  question: string;
  answer: string;
  keywords?: string[];
  priority?: number;
  isActive?: boolean; // Made optional by omitting from parent first
}

export interface CreateKnowledgeData {
  category: KnowledgeCategory;
  question: string;
  answer: string;
  keywords?: string[];
  priority?: number;
  isActive?: boolean;
}

export interface DashboardSummary {
  hotelName: string;
  currency: string;
  totalBookings: number;
  totalRevenue: number;
  totalConversations: number;
  resolutionRate: number;
  recentBookings: {
    id: string;
    guestName: string;
    roomType: string;
    checkIn: string;
    checkOut: string;
    status: string;
    amount: number;
  }[];
}

export interface DashboardStats {
  totalBookings: number;
  bookingsChange: number;
  revenue: number;
  revenueChange: number;
  upcomingCheckIns: number;
  activeConversations: number;
  conversationsChange: number;
  conversionRate: number;
  conversionChange: number;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  name: string;
  hotelName?: string;
  hotelSlug?: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType?: string;
}

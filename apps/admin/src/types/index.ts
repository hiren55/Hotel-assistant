// User types
export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  hotelId?: string;
  createdAt: string;
  updatedAt: string;
}

export type UserRole = 'super_admin' | 'hotel_owner' | 'hotel_manager' | 'hotel_staff';

// Auth types
export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
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
}

// Hotel types
export interface Hotel {
  id: string;
  name: string;
  slug: string;
  description?: string;
  address?: HotelAddress;
  contactEmail?: string;
  contactPhone?: string;
  website?: string;
  logoUrl?: string;
  coverImageUrl?: string;
  timezone: string;
  currency: string;
  settings: HotelSettings;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface HotelAddress {
  street?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
}

export interface HotelSettings {
  checkInTime?: string;
  checkOutTime?: string;
  primaryColor?: string;
  welcomeMessage?: string;
  fallbackMessage?: string;
}

// Room types
export interface Room {
  id: string;
  hotelId: string;
  name: string;
  type: RoomType;
  description?: string;
  basePrice: number;
  currency: string;
  maxOccupancy: number;
  maxAdults: number;
  maxChildren: number;
  amenities: string[];
  images: string[];
  status: RoomStatus;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export type RoomType = 'standard' | 'deluxe' | 'suite' | 'family' | 'executive' | 'penthouse';
export type RoomStatus = 'available' | 'occupied' | 'maintenance' | 'disabled';

export interface CreateRoomData {
  name: string;
  type: RoomType;
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

// Booking types
export interface Booking {
  id: string;
  hotelId: string;
  roomId: string;
  room?: Room;
  guestName: string;
  guestEmail: string;
  guestPhone?: string;
  checkIn: string;
  checkOut: string;
  adults: number;
  children: number;
  totalPrice: number;
  currency: string;
  status: BookingStatus;
  specialRequests?: string;
  internalNotes?: string;
  source: BookingSource;
  confirmationNumber?: string;
  createdAt: string;
  updatedAt: string;
}

export type BookingStatus = 'pending' | 'confirmed' | 'checked_in' | 'checked_out' | 'cancelled' | 'no_show';
export type BookingSource = 'widget' | 'manual' | 'api';

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

// Knowledge base types
export interface KnowledgeEntry {
  id: string;
  hotelId: string;
  category: KnowledgeCategory;
  question: string;
  answer: string;
  keywords: string[];
  priority: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export type KnowledgeCategory = 'general' | 'rooms' | 'amenities' | 'policies' | 'location' | 'faq';

export interface CreateKnowledgeData {
  category: KnowledgeCategory;
  question: string;
  answer: string;
  keywords?: string[];
  priority?: number;
  isActive?: boolean;
}

// Stats types
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

// Pagination types
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

// API Response types
export interface ApiResponse<T> {
  data: T;
  message?: string;
}

export interface ApiError {
  message: string;
  code?: string;
  statusCode: number;
  errors?: Record<string, string[]>;
}

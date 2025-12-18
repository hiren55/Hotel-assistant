/**
 * Booking-related type definitions
 */

export type BookingStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'no_show';
export type BookingSource = 'widget' | 'admin' | 'api';

export interface GuestDetails {
  name: string;
  email: string;
  phone?: string;
}

export interface BookingMetadata {
  source: BookingSource;
  conversationId?: string;
  ipAddress?: string;
  userAgent?: string;
  [key: string]: unknown;
}

export interface Booking {
  id: string;
  hotelId: string;
  roomId: string;
  bookingNumber: string;
  guestName: string;
  guestEmail: string;
  guestPhone?: string;
  checkIn: Date;
  checkOut: Date;
  nights: number;
  adults: number;
  children: number;
  totalPrice: number;
  currency: string;
  status: BookingStatus;
  specialRequests?: string;
  source: BookingSource;
  metadata?: BookingMetadata;
  createdAt: Date;
  updatedAt: Date;
  cancelledAt?: Date;
}

export interface CreateBookingDto {
  roomId: string;
  guestName: string;
  guestEmail: string;
  guestPhone?: string;
  checkIn: Date | string;
  checkOut: Date | string;
  adults?: number;
  children?: number;
  specialRequests?: string;
  source?: BookingSource;
  metadata?: Partial<BookingMetadata>;
}

export interface UpdateBookingDto {
  guestName?: string;
  guestEmail?: string;
  guestPhone?: string;
  checkIn?: Date | string;
  checkOut?: Date | string;
  adults?: number;
  children?: number;
  specialRequests?: string;
  status?: BookingStatus;
}

export interface AvailabilityQuery {
  roomId?: string;
  checkIn: Date | string;
  checkOut: Date | string;
}

export interface AvailabilityResponse {
  roomId: string;
  roomName: string;
  isAvailable: boolean;
  totalPrice: number;
  currency: string;
  nights: number;
}

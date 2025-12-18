import { apiClient } from './client';
import type {
  Booking,
  CreateBookingData,
  PaginatedResponse,
  PaginationParams,
  BookingStatus,
} from '@/types';

export interface BookingFilters extends PaginationParams {
  status?: BookingStatus;
  startDate?: string;
  endDate?: string;
  search?: string;
  roomId?: string;
}

export const bookingsApi = {
  // Get all bookings for a hotel
  getBookings: (hotelId: string, filters?: BookingFilters) =>
    apiClient.get<PaginatedResponse<Booking>>(`/bookings/${hotelId}`, filters),

  // Get single booking
  getBooking: (hotelId: string, bookingId: string) =>
    apiClient.get<Booking>(`/bookings/${hotelId}/${bookingId}`),

  // Create booking
  createBooking: (hotelId: string, data: CreateBookingData) =>
    apiClient.post<Booking>(`/bookings/${hotelId}`, data),

  // Update booking
  updateBooking: (hotelId: string, bookingId: string, data: Partial<Booking>) =>
    apiClient.patch<Booking>(`/bookings/${hotelId}/${bookingId}`, data),

  // Cancel booking
  cancelBooking: (hotelId: string, bookingId: string, reason?: string) =>
    apiClient.patch<Booking>(`/bookings/${hotelId}/${bookingId}/cancel`, { reason }),

  // Confirm booking
  confirmBooking: (hotelId: string, bookingId: string) =>
    apiClient.patch<Booking>(`/bookings/${hotelId}/${bookingId}/confirm`, {}),

  // Check in
  checkIn: (hotelId: string, bookingId: string) =>
    apiClient.patch<Booking>(`/bookings/${hotelId}/${bookingId}/check-in`, {}),

  // Check out
  checkOut: (hotelId: string, bookingId: string) =>
    apiClient.patch<Booking>(`/bookings/${hotelId}/${bookingId}/check-out`, {}),

  // Get upcoming check-ins
  getUpcomingCheckIns: (hotelId: string, days: number = 7) =>
    apiClient.get<Booking[]>(`/bookings/${hotelId}/upcoming`, { days }),

  // Check availability
  checkAvailability: (
    hotelId: string,
    checkIn: string,
    checkOut: string,
    guests?: number
  ) =>
    apiClient.get<{ available: boolean; rooms: { id: string; name: string; available: boolean }[] }>(
      `/bookings/${hotelId}/availability`,
      { checkIn, checkOut, guests }
    ),
};

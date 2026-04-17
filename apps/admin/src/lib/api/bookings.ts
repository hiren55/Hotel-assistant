import { apiClient } from './client';
import type {
  Booking,
  CreateBookingDto,
  UpdateBookingDto,
  PaginatedResponse,
  BookingStatus,
  ApiResponse,
  FilterQuery,
} from '@hotel-assistant/shared';

export interface BookingFilters extends FilterQuery {
  status?: BookingStatus;
  startDate?: string;
  endDate?: string;
  search?: string;
  roomId?: string;
}

export interface AvailabilityResponse {
  available: boolean;
  rooms: { id: string; name: string; available: boolean }[];
}

export const bookingsApi = {
  // Get all bookings for a hotel
  getBookings: (hotelId: string, filters?: BookingFilters) =>
    apiClient.get<ApiResponse<PaginatedResponse<Booking>>>(`/hotels/${hotelId}/bookings`, filters),

  // Get single booking
  getBooking: (hotelId: string, bookingId: string) =>
    apiClient.get<Booking>(`/hotels/${hotelId}/bookings/${bookingId}`),

  // Create booking
  createBooking: (hotelId: string, data: CreateBookingDto) =>
    apiClient.post<Booking>(`/hotels/${hotelId}/bookings`, data),

  // Update booking
  updateBooking: (hotelId: string, bookingId: string, data: UpdateBookingDto) =>
    apiClient.put<Booking>(`/hotels/${hotelId}/bookings/${bookingId}`, data),

  // Cancel booking (backend uses DELETE)
  cancelBooking: (hotelId: string, bookingId: string) =>
    apiClient.delete<Booking>(`/hotels/${hotelId}/bookings/${bookingId}`),

  // Confirm booking
  confirmBooking: (hotelId: string, bookingId: string) =>
    apiClient.put<Booking>(`/hotels/${hotelId}/bookings/${bookingId}/status`, {
      status: 'confirmed' as BookingStatus,
    }),

  // Check in
  checkIn: (hotelId: string, bookingId: string) =>
    apiClient.put<Booking>(`/hotels/${hotelId}/bookings/${bookingId}/status`, {
      status: 'checked_in' as BookingStatus,
    }),

  // Check out
  checkOut: (hotelId: string, bookingId: string) =>
    apiClient.put<Booking>(`/hotels/${hotelId}/bookings/${bookingId}/status`, {
      status: 'checked_out' as BookingStatus,
    }),

  // Get upcoming check-ins
  getUpcomingCheckIns: (hotelId: string, days = 7) =>
    apiClient.get<Booking[]>(`/hotels/${hotelId}/bookings/upcoming`, { days }),

  // Check availability
  checkAvailability: (hotelId: string, checkIn: string, checkOut: string, guests?: number) =>
    apiClient.get<AvailabilityResponse>(`/hotels/${hotelId}/bookings/availability`, {
      checkIn,
      checkOut,
      guests,
    }),
};

export type { BookingFilters };

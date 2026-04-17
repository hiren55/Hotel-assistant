import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { bookingsApi, type BookingFilters } from '../api/bookings';
import type { CreateBookingDto, UpdateBookingDto, BookingStatus, Booking } from '@hotel-assistant/shared';

export const bookingKeys = {
  all: ['bookings'] as const,
  lists: () => [...bookingKeys.all, 'list'] as const,
  list: (hotelId: string, filters?: BookingFilters) =>
    [...bookingKeys.lists(), hotelId, filters] as const,
  details: () => [...bookingKeys.all, 'detail'] as const,
  detail: (hotelId: string, bookingId: string) =>
    [...bookingKeys.details(), hotelId, bookingId] as const,
  upcoming: (hotelId: string, days: number) =>
    [...bookingKeys.all, 'upcoming', hotelId, days] as const,
};

export function useBookings(hotelId: string, filters?: BookingFilters) {
  return useQuery({
    queryKey: bookingKeys.list(hotelId, filters),
    queryFn: () => bookingsApi.getBookings(hotelId, filters),
    enabled: !!hotelId,
    placeholderData: keepPreviousData, // Keep old data visible while refetching (no flash)
    // Add retry logic to handle transient errors
    retry: (failureCount, error) => {
      // Check if error is retryable (network errors, rate limits, etc.)
      if (error instanceof Error) {
        const isRetryable = !error.message.toLowerCase().includes('not found') &&
                           !error.message.toLowerCase().includes('validation');
        return isRetryable && failureCount < 3;
      }
      return false;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
  });
}

export function useBooking(hotelId: string, bookingId: string) {
  return useQuery({
    queryKey: bookingKeys.detail(hotelId, bookingId),
    queryFn: () => bookingsApi.getBooking(hotelId, bookingId),
    enabled: !!hotelId && !!bookingId,
  });
}

export function useUpcomingCheckIns(hotelId: string, days = 7) {
  return useQuery({
    queryKey: bookingKeys.upcoming(hotelId, days),
    queryFn: () => bookingsApi.getUpcomingCheckIns(hotelId, days),
    enabled: !!hotelId,
  });
}

export function useCreateBooking(hotelId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateBookingDto) => bookingsApi.createBooking(hotelId, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: bookingKeys.lists() });
    },
  });
}

export function useUpdateBooking(hotelId: string, bookingId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateBookingDto) => bookingsApi.updateBooking(hotelId, bookingId, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: bookingKeys.lists() });
      void queryClient.invalidateQueries({
        queryKey: bookingKeys.detail(hotelId, bookingId),
      });
    },
  });
}

export function useCancelBooking(hotelId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ bookingId }: { bookingId: string; _reason?: string }) =>
      bookingsApi.cancelBooking(hotelId, bookingId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: bookingKeys.lists() });
    },
  });
}

export function useConfirmBooking(hotelId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (bookingId: string) => bookingsApi.confirmBooking(hotelId, bookingId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: bookingKeys.lists() });
    },
  });
}

export function useCheckIn(hotelId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (bookingId: string) => bookingsApi.checkIn(hotelId, bookingId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: bookingKeys.lists() });
    },
  });
}

export function useCheckOut(hotelId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (bookingId: string) => bookingsApi.checkOut(hotelId, bookingId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: bookingKeys.lists() });
    },
  });
}

export function useCheckAvailability(hotelId: string) {
  return useMutation({
    mutationFn: ({
      checkIn,
      checkOut,
      guests,
    }: {
      checkIn: string;
      checkOut: string;
      guests?: number;
    }) => bookingsApi.checkAvailability(hotelId, checkIn, checkOut, guests),
  });
}

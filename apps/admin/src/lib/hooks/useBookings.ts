'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { bookingsApi, BookingFilters } from '@/lib/api';
import type { CreateBookingData, Booking } from '@/types';

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
  });
}

export function useBooking(hotelId: string, bookingId: string) {
  return useQuery({
    queryKey: bookingKeys.detail(hotelId, bookingId),
    queryFn: () => bookingsApi.getBooking(hotelId, bookingId),
    enabled: !!hotelId && !!bookingId,
  });
}

export function useUpcomingCheckIns(hotelId: string, days: number = 7) {
  return useQuery({
    queryKey: bookingKeys.upcoming(hotelId, days),
    queryFn: () => bookingsApi.getUpcomingCheckIns(hotelId, days),
    enabled: !!hotelId,
  });
}

export function useCreateBooking(hotelId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateBookingData) =>
      bookingsApi.createBooking(hotelId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: bookingKeys.lists() });
    },
  });
}

export function useUpdateBooking(hotelId: string, bookingId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Partial<Booking>) =>
      bookingsApi.updateBooking(hotelId, bookingId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: bookingKeys.lists() });
      queryClient.invalidateQueries({
        queryKey: bookingKeys.detail(hotelId, bookingId),
      });
    },
  });
}

export function useCancelBooking(hotelId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ bookingId, reason }: { bookingId: string; reason?: string }) =>
      bookingsApi.cancelBooking(hotelId, bookingId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: bookingKeys.lists() });
    },
  });
}

export function useConfirmBooking(hotelId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (bookingId: string) =>
      bookingsApi.confirmBooking(hotelId, bookingId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: bookingKeys.lists() });
    },
  });
}

export function useCheckIn(hotelId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (bookingId: string) => bookingsApi.checkIn(hotelId, bookingId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: bookingKeys.lists() });
    },
  });
}

export function useCheckOut(hotelId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (bookingId: string) => bookingsApi.checkOut(hotelId, bookingId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: bookingKeys.lists() });
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

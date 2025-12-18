'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { hotelsApi } from '@/lib/api';
import type { Hotel, HotelSettings } from '@/types';

export const hotelKeys = {
  all: ['hotels'] as const,
  my: () => [...hotelKeys.all, 'my'] as const,
  detail: (id: string) => [...hotelKeys.all, 'detail', id] as const,
  stats: (id: string) => [...hotelKeys.all, 'stats', id] as const,
};

export function useMyHotel() {
  return useQuery({
    queryKey: hotelKeys.my(),
    queryFn: () => hotelsApi.getMyHotel(),
  });
}

export function useHotel(id: string) {
  return useQuery({
    queryKey: hotelKeys.detail(id),
    queryFn: () => hotelsApi.getHotel(id),
    enabled: !!id,
  });
}

export function useDashboardStats(hotelId: string) {
  return useQuery({
    queryKey: hotelKeys.stats(hotelId),
    queryFn: () => hotelsApi.getDashboardStats(hotelId),
    enabled: !!hotelId,
    // Refresh stats every minute
    refetchInterval: 60 * 1000,
  });
}

export function useUpdateHotel(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Partial<Hotel>) => hotelsApi.updateHotel(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: hotelKeys.my() });
      queryClient.invalidateQueries({ queryKey: hotelKeys.detail(id) });
    },
  });
}

export function useUpdateHotelSettings(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (settings: Partial<HotelSettings>) =>
      hotelsApi.updateSettings(id, settings),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: hotelKeys.my() });
      queryClient.invalidateQueries({ queryKey: hotelKeys.detail(id) });
    },
  });
}

export function useUploadLogo(hotelId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (file: File) => hotelsApi.uploadLogo(hotelId, file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: hotelKeys.my() });
      queryClient.invalidateQueries({ queryKey: hotelKeys.detail(hotelId) });
    },
  });
}

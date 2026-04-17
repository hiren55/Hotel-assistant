import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { hotelsApi } from '../api/hotels';
import type { HotelSettings, UpdateHotelDto } from '@hotel-assistant/shared';

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
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    staleTime: 0,
  });
}

export function useHotel(id: string) {
  useEffect(() => {
    if (!id) return;
    // Trigger immediate refetch to ensure fresh data
    void queryClient.refetchQueries({ queryKey: hotelKeys.detail(id), exact: true });
  }, [id]);

  const queryClient = useQueryClient();

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
    refetchOnWindowFocus: true,
  });
}

export function useDashboardSummary(hotelId: string) {
  return useQuery({
    queryKey: [...hotelKeys.stats(hotelId), 'summary'],
    queryFn: () => hotelsApi.getDashboardSummary(hotelId),
    enabled: !!hotelId,
    refetchInterval: 60 * 1000,
    refetchOnWindowFocus: true,
  });
}

export function useUpdateHotel() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateHotelDto }) => hotelsApi.updateHotel(id, data as any),
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({ queryKey: hotelKeys.my() });
      void queryClient.invalidateQueries({ queryKey: hotelKeys.detail(variables.id) });
    },
  });
}

export function useUpdateHotelSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, settings }: { id: string; settings: Partial<HotelSettings> }) =>
      hotelsApi.updateSettings(id, settings),
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({ queryKey: hotelKeys.my() });
      void queryClient.invalidateQueries({ queryKey: hotelKeys.detail(variables.id) });
    },
  });
}

export function useUploadLogo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ hotelId, file }: { hotelId: string; file: File }) => hotelsApi.uploadLogo(hotelId, file),
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({ queryKey: hotelKeys.my() });
      void queryClient.invalidateQueries({ queryKey: hotelKeys.detail(variables.hotelId) });
    },
  });
}

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { roomsApi, type RoomFilters } from '../api/rooms';
import type { CreateRoomDto, UpdateRoomDto, Room } from '@hotel-assistant/shared';

export const roomKeys = {
  all: ['rooms'] as const,
  lists: () => [...roomKeys.all, 'list'] as const,
  list: (hotelId: string, filters?: RoomFilters) =>
    [...roomKeys.lists(), hotelId, filters] as const,
  details: () => [...roomKeys.all, 'detail'] as const,
  detail: (hotelId: string, roomId: string) =>
    [...roomKeys.details(), hotelId, roomId] as const,
};

export function useRooms(hotelId: string, filters?: RoomFilters) {
  return useQuery({
    queryKey: roomKeys.list(hotelId, filters),
    queryFn: () => roomsApi.getRooms(hotelId, filters),
    enabled: !!hotelId,
  });
}

export function useRoom(hotelId: string, roomId: string) {
  return useQuery({
    queryKey: roomKeys.detail(hotelId, roomId),
    queryFn: () => roomsApi.getRoom(hotelId, roomId),
    enabled: !!hotelId && !!roomId,
  });
}

export function useCreateRoom(hotelId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateRoomDto) => roomsApi.createRoom(hotelId, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: roomKeys.lists() });
    },
  });
}

export function useUpdateRoom(hotelId: string, roomId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateRoomDto) => roomsApi.updateRoom(hotelId, roomId, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: roomKeys.lists() });
      void queryClient.invalidateQueries({
        queryKey: roomKeys.detail(hotelId, roomId),
      });
    },
  });
}

export function useDeleteRoom(hotelId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (roomId: string) => roomsApi.deleteRoom(hotelId, roomId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: roomKeys.lists() });
    },
  });
}

export function useUpdateRoomStatus(hotelId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ roomId, status }: { roomId: string; status: Room['status'] }) =>
      roomsApi.updateStatus(hotelId, roomId, status),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: roomKeys.lists() });
    },
  });
}

export function useBulkUpdateRoomStatus(hotelId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ roomIds, status }: { roomIds: string[]; status: Room['status'] }) =>
      roomsApi.bulkUpdateStatus(hotelId, roomIds, status),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: roomKeys.lists() });
    },
  });
}

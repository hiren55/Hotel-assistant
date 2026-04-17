import { apiClient } from './client';
import type { Room, CreateRoomDto, UpdateRoomDto, ApiResponse } from '@hotel-assistant/shared';

export interface RoomFilters {
  page?: number;
  limit?: number;
  sort?: string;
  order?: 'asc' | 'desc';
  status?: string;
  type?: string;
  search?: string;
  [key: string]: string | number | boolean | undefined;
}

export const roomsApi = {
  // Get all rooms for a hotel
  getRooms: (hotelId: string, filters?: RoomFilters) =>
    apiClient.get<ApiResponse<Room[]>>(`/hotels/${hotelId}/rooms`, filters),

  // Get single room
  getRoom: (hotelId: string, roomId: string) =>
    apiClient.get<Room>(`/hotels/${hotelId}/rooms/${roomId}`),

  // Create room
  createRoom: (hotelId: string, data: CreateRoomDto) => {
    return apiClient.post<Room>(`/hotels/${hotelId}/rooms`, data);
  },

  // Update room
  updateRoom: (hotelId: string, roomId: string, data: UpdateRoomDto) => {
    return apiClient.put<Room>(`/hotels/${hotelId}/rooms/${roomId}`, data);
  },

  // Delete room
  deleteRoom: (hotelId: string, roomId: string) =>
    apiClient.delete<void>(`/hotels/${hotelId}/rooms/${roomId}`),

  // Update room status
  updateStatus: (hotelId: string, roomId: string, status: Room['status']) =>
    apiClient.put<Room>(`/hotels/${hotelId}/rooms/${roomId}/status`, { status }),

  // Bulk update status
  bulkUpdateStatus: (hotelId: string, roomIds: string[], status: Room['status']) =>
    apiClient.put<{ updated: number }>(`/hotels/${hotelId}/rooms/bulk/status`, {
      roomIds,
      status,
    }),

  // Reorder rooms
  reorderRooms: (hotelId: string, roomIds: string[]) =>
    apiClient.put<void>(`/hotels/${hotelId}/rooms/reorder`, { roomIds }),

  // Upload room images
  uploadImages: async (
    hotelId: string,
    roomId: string,
    files: File[]
  ): Promise<{ urls: string[] }> => {
    const formData = new FormData();
    files.forEach((file) => formData.append('images', file));

    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/v1/hotels/${hotelId}/rooms/${roomId}/images`,
      {
        method: 'POST',
        headers: {
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: formData,
      }
    );

    if (!response.ok) {
      throw new Error('Failed to upload images');
    }

    const result: unknown = await response.json();
    if (result && typeof result === 'object' && 'urls' in result) {
      return { urls: (result as { urls: string[] }).urls };
    }

    return { urls: [] };
  },
};


import { apiClient } from './client';
import type {
  Room,
  CreateRoomData,
  UpdateRoomData,
  PaginatedResponse,
  PaginationParams,
  RoomStatus,
} from '@/types';

export interface RoomFilters extends PaginationParams {
  status?: RoomStatus;
  type?: string;
  search?: string;
}

export const roomsApi = {
  // Get all rooms for a hotel
  getRooms: (hotelId: string, filters?: RoomFilters) =>
    apiClient.get<PaginatedResponse<Room>>(`/rooms/${hotelId}`, filters),

  // Get single room
  getRoom: (hotelId: string, roomId: string) =>
    apiClient.get<Room>(`/rooms/${hotelId}/${roomId}`),

  // Create room
  createRoom: (hotelId: string, data: CreateRoomData) =>
    apiClient.post<Room>(`/rooms/${hotelId}`, data),

  // Update room
  updateRoom: (hotelId: string, roomId: string, data: UpdateRoomData) =>
    apiClient.patch<Room>(`/rooms/${hotelId}/${roomId}`, data),

  // Delete room
  deleteRoom: (hotelId: string, roomId: string) =>
    apiClient.delete<void>(`/rooms/${hotelId}/${roomId}`),

  // Update room status
  updateStatus: (hotelId: string, roomId: string, status: RoomStatus) =>
    apiClient.patch<Room>(`/rooms/${hotelId}/${roomId}/status`, { status }),

  // Bulk update status
  bulkUpdateStatus: (hotelId: string, roomIds: string[], status: RoomStatus) =>
    apiClient.patch<{ updated: number }>(`/rooms/${hotelId}/bulk/status`, {
      roomIds,
      status,
    }),

  // Reorder rooms
  reorderRooms: (hotelId: string, roomIds: string[]) =>
    apiClient.patch<void>(`/rooms/${hotelId}/reorder`, { roomIds }),

  // Upload room images
  uploadImages: async (
    hotelId: string,
    roomId: string,
    files: File[]
  ): Promise<{ urls: string[] }> => {
    const formData = new FormData();
    files.forEach((file) => formData.append('images', file));

    const token = localStorage.getItem('accessToken');
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/rooms/${hotelId}/${roomId}/images`,
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

    return response.json();
  },
};

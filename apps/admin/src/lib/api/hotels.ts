import { apiClient } from './client';
import type { Hotel, HotelSettings, DashboardStats } from '@/types';

export const hotelsApi = {
  // Get current user's hotel
  getMyHotel: () => apiClient.get<Hotel>('/hotels/me'),

  // Get hotel by ID
  getHotel: (id: string) => apiClient.get<Hotel>(`/hotels/${id}`),

  // Update hotel
  updateHotel: (id: string, data: Partial<Hotel>) =>
    apiClient.patch<Hotel>(`/hotels/${id}`, data),

  // Update hotel settings
  updateSettings: (id: string, settings: Partial<HotelSettings>) =>
    apiClient.patch<Hotel>(`/hotels/${id}/settings`, { settings }),

  // Get dashboard stats
  getDashboardStats: (hotelId: string) =>
    apiClient.get<DashboardStats>(`/hotels/${hotelId}/stats`),

  // Upload logo
  uploadLogo: async (hotelId: string, file: File): Promise<{ url: string }> => {
    const formData = new FormData();
    formData.append('file', file);

    const token = localStorage.getItem('accessToken');
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/hotels/${hotelId}/logo`,
      {
        method: 'POST',
        headers: {
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: formData,
      }
    );

    if (!response.ok) {
      throw new Error('Failed to upload logo');
    }

    return response.json();
  },
};

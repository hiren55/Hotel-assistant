import { apiClient } from './client';
import type { Hotel, HotelSettings, HotelBranding, DashboardStats, DashboardSummary } from '../../types';

export const hotelsApi = {
  // Get current user's hotel
  getMyHotel: () => apiClient.get<Hotel>('/hotels/me'),

  // Get hotel by ID
  getHotel: (id: string) => apiClient.get<Hotel>(`/hotels/${id}`),

  // Update hotel
  updateHotel: (id: string, data: Partial<Hotel>) => apiClient.put<Hotel>(`/hotels/${id}`, data),

  // Update hotel settings
  updateSettings: async (id: string, settings: Partial<HotelSettings>) => {
    const backendSettings: Partial<HotelSettings> = {};
    const backendBranding: Partial<HotelBranding> = {};
    let hasSettings = false;
    let hasBranding = false;

    if (settings.checkInTime !== undefined) {
      backendSettings.checkInTime = settings.checkInTime;
    }
    if (settings.checkOutTime !== undefined) {
      backendSettings.checkOutTime = settings.checkOutTime;
    }

    if (Object.keys(backendSettings).length > 0) {
      await apiClient.put<Hotel>(`/hotels/${id}/settings`, backendSettings);
    }

    if (Object.keys(backendBranding).length > 0) {
      await apiClient.put<Hotel>(`/hotels/${id}`, { branding: backendBranding });
    }

    return apiClient.get<Hotel>(`/hotels/${id}`);
  },

  // Get dashboard stats
  getDashboardStats: (hotelId: string) => apiClient.get<DashboardStats>(`/hotels/${hotelId}/stats`),

  // Get dashboard summary
  getDashboardSummary: (hotelId: string) => apiClient.get<DashboardSummary>(`/hotels/${hotelId}/dashboard/summary`),

  // Upload logo
  uploadLogo: async (hotelId: string, file: File): Promise<{ url: string }> => {
    const formData = new FormData();
    formData.append('file', file);

    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/v1/hotels/${hotelId}/logo`,
      {
        method: 'POST',
        headers: {
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: formData,
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to upload logo: ${response.status}`);
    }

    const result: unknown = await response.json();
    if (result && typeof result === 'object' && 'url' in result) {
      return { url: (result as { url: string }).url };
    }

    throw new Error('Invalid response from server');
  },
};

import { apiClient } from './client';
import type { User, CreateUserDto, UpdateUserDto } from '../../types';

export const usersApi = {
  // List team members for a hotel
  getTeamMembers: (hotelId: string) => 
    apiClient.get<User[]>(`/hotels/${hotelId}/users`),

  // Add a new team member
  addMember: (hotelId: string, data: CreateUserDto & { jobTitle?: string }) => 
    apiClient.post<User>(`/hotels/${hotelId}/users`, data),

  // Update a team member
  updateMember: (hotelId: string, userId: string, data: UpdateUserDto) => 
    apiClient.patch<User>(`/hotels/${hotelId}/users/${userId}`, data),

  // Delete a team member
  deleteMember: (hotelId: string, userId: string) => 
    apiClient.delete(`/hotels/${hotelId}/users/${userId}`),

  // Accept/Approve a pending member
  acceptMember: (hotelId: string, userId: string) => 
    apiClient.patch<User>(`/hotels/${hotelId}/users/${userId}`, { status: 'active' }),
};

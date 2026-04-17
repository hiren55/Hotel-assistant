import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usersApi } from '../api/users';
import type { User, CreateUserDto, UpdateUserDto } from '../../types';

export function useTeamMembers(hotelId: string) {
  return useQuery({
    queryKey: ['team', hotelId],
    queryFn: () => usersApi.getTeamMembers(hotelId),
    enabled: !!hotelId,
  });
}

export function useAddMember(hotelId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateUserDto & { jobTitle?: string }) => 
      usersApi.addMember(hotelId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team', hotelId] });
    },
  });
}

export function useUpdateMember(hotelId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, data }: { userId: string; data: UpdateUserDto }) => 
      usersApi.updateMember(hotelId, userId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team', hotelId] });
    },
  });
}

export function useDeleteMember(hotelId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userId: string) => usersApi.deleteMember(hotelId, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team', hotelId] });
    },
  });
}

export function useAcceptMember(hotelId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userId: string) => usersApi.acceptMember(hotelId, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team', hotelId] });
    },
  });
}

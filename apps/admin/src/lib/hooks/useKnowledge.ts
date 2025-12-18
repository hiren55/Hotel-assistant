'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { knowledgeApi } from '@/lib/api';
import type { CreateKnowledgeData, KnowledgeCategory } from '@/types';

export const knowledgeKeys = {
  all: ['knowledge'] as const,
  lists: () => [...knowledgeKeys.all, 'list'] as const,
  list: (hotelId: string, category?: KnowledgeCategory) =>
    [...knowledgeKeys.lists(), hotelId, category] as const,
  grouped: (hotelId: string) =>
    [...knowledgeKeys.all, 'grouped', hotelId] as const,
  details: () => [...knowledgeKeys.all, 'detail'] as const,
  detail: (hotelId: string, entryId: string) =>
    [...knowledgeKeys.details(), hotelId, entryId] as const,
  context: (hotelId: string) =>
    [...knowledgeKeys.all, 'context', hotelId] as const,
};

export function useKnowledgeEntries(hotelId: string, category?: KnowledgeCategory) {
  return useQuery({
    queryKey: knowledgeKeys.list(hotelId, category),
    queryFn: () => knowledgeApi.getEntries(hotelId, category),
    enabled: !!hotelId,
  });
}

export function useGroupedKnowledge(hotelId: string) {
  return useQuery({
    queryKey: knowledgeKeys.grouped(hotelId),
    queryFn: () => knowledgeApi.getGroupedEntries(hotelId),
    enabled: !!hotelId,
  });
}

export function useKnowledgeEntry(hotelId: string, entryId: string) {
  return useQuery({
    queryKey: knowledgeKeys.detail(hotelId, entryId),
    queryFn: () => knowledgeApi.getEntry(hotelId, entryId),
    enabled: !!hotelId && !!entryId,
  });
}

export function useAIContext(hotelId: string) {
  return useQuery({
    queryKey: knowledgeKeys.context(hotelId),
    queryFn: () => knowledgeApi.getAIContext(hotelId),
    enabled: !!hotelId,
  });
}

export function useCreateKnowledgeEntry(hotelId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateKnowledgeData) =>
      knowledgeApi.createEntry(hotelId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: knowledgeKeys.lists() });
      queryClient.invalidateQueries({ queryKey: knowledgeKeys.grouped(hotelId) });
    },
  });
}

export function useUpdateKnowledgeEntry(hotelId: string, entryId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Partial<CreateKnowledgeData>) =>
      knowledgeApi.updateEntry(hotelId, entryId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: knowledgeKeys.lists() });
      queryClient.invalidateQueries({ queryKey: knowledgeKeys.grouped(hotelId) });
      queryClient.invalidateQueries({
        queryKey: knowledgeKeys.detail(hotelId, entryId),
      });
    },
  });
}

export function useDeleteKnowledgeEntry(hotelId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (entryId: string) => knowledgeApi.deleteEntry(hotelId, entryId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: knowledgeKeys.lists() });
      queryClient.invalidateQueries({ queryKey: knowledgeKeys.grouped(hotelId) });
    },
  });
}

export function useToggleKnowledgeEntry(hotelId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (entryId: string) => knowledgeApi.toggleActive(hotelId, entryId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: knowledgeKeys.lists() });
      queryClient.invalidateQueries({ queryKey: knowledgeKeys.grouped(hotelId) });
    },
  });
}

export function useBulkImportKnowledge(hotelId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (entries: CreateKnowledgeData[]) =>
      knowledgeApi.bulkImport(hotelId, entries),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: knowledgeKeys.lists() });
      queryClient.invalidateQueries({ queryKey: knowledgeKeys.grouped(hotelId) });
    },
  });
}

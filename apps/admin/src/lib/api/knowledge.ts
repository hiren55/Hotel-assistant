import { apiClient } from './client';
import type {
  KnowledgeEntry,
  CreateKnowledgeData,
  KnowledgeCategory,
} from '@/types';

export const knowledgeApi = {
  // Get all knowledge entries for a hotel
  getEntries: (hotelId: string, category?: KnowledgeCategory) =>
    apiClient.get<KnowledgeEntry[]>(`/knowledge/${hotelId}`, { category }),

  // Get grouped entries by category
  getGroupedEntries: (hotelId: string) =>
    apiClient.get<Record<KnowledgeCategory, KnowledgeEntry[]>>(`/knowledge/${hotelId}/grouped`),

  // Get single entry
  getEntry: (hotelId: string, entryId: string) =>
    apiClient.get<KnowledgeEntry>(`/knowledge/${hotelId}/${entryId}`),

  // Create entry
  createEntry: (hotelId: string, data: CreateKnowledgeData) =>
    apiClient.post<KnowledgeEntry>(`/knowledge/${hotelId}`, data),

  // Update entry
  updateEntry: (hotelId: string, entryId: string, data: Partial<CreateKnowledgeData>) =>
    apiClient.patch<KnowledgeEntry>(`/knowledge/${hotelId}/${entryId}`, data),

  // Delete entry
  deleteEntry: (hotelId: string, entryId: string) =>
    apiClient.delete<void>(`/knowledge/${hotelId}/${entryId}`),

  // Toggle active status
  toggleActive: (hotelId: string, entryId: string) =>
    apiClient.patch<KnowledgeEntry>(`/knowledge/${hotelId}/${entryId}/toggle`, {}),

  // Bulk import entries
  bulkImport: (hotelId: string, entries: CreateKnowledgeData[]) =>
    apiClient.post<{ imported: number }>(`/knowledge/${hotelId}/bulk`, { entries }),

  // Get context for AI (used for testing/preview)
  getAIContext: (hotelId: string) =>
    apiClient.get<string>(`/knowledge/${hotelId}/context`),
};

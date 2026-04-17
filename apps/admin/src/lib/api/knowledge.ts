import { apiClient } from './client';
import type {
  KnowledgeEntry,
  CreateKnowledgeEntryDto,
  UpdateKnowledgeEntryDto,
  KnowledgeCategory,
  PaginatedResponse,
  ApiResponse,
  FilterQuery,
} from '@hotel-assistant/shared';

export interface KnowledgeFilters extends FilterQuery {
  category?: KnowledgeCategory;
}

// Maps the backend KnowledgeEntry to frontend format
const mapToFrontend = (entry: KnowledgeEntry): KnowledgeEntry => ({
  id: entry.id,
  hotelId: entry.hotelId,
  category: entry.category,
  key: entry.key,
  value: entry.value,
  isActive: entry.isActive,
  sortOrder: entry.sortOrder,
  createdAt: entry.createdAt,
  updatedAt: entry.updatedAt,
});

// Maps the frontend CreateKnowledgeEntryDto to backend format (they're the same)
const mapToBackend = (data: Partial<CreateKnowledgeEntryDto>) => {
  const payload: Partial<CreateKnowledgeEntryDto> = {};
  if (data.category) payload.category = data.category;
  if (data.key !== undefined) payload.key = data.key;
  if (data.value !== undefined) payload.value = data.value;
  if (data.isActive !== undefined) payload.isActive = data.isActive;
  if (data.sortOrder !== undefined) payload.sortOrder = data.sortOrder;
  return payload;
};

export const knowledgeApi = {
  // Get all knowledge entries for a hotel
  getEntries: async (hotelId: string, category?: KnowledgeCategory) => {
    const filters = category ? { category } : {};
    const res = await apiClient.get<ApiResponse<PaginatedResponse<KnowledgeEntry>>>(
      `/hotels/${hotelId}/knowledge`,
      filters
    );

    const entries = Array.isArray(res.data) ? res.data : [];
    return entries.map(mapToFrontend);
  },

  // Get grouped entries by category
  getGroupedEntries: async (hotelId: string) => {
    const res = await apiClient.get<ApiResponse<PaginatedResponse<KnowledgeEntry>>>(
      `/hotels/${hotelId}/knowledge`,
      { limit: 1000 }
    );

    const entries = Array.isArray(res.data) ? res.data : [];

    const grouped: Partial<Record<KnowledgeCategory, KnowledgeEntry[]>> = {};
    entries.forEach((entry) => {
      const frontendEntry = mapToFrontend(entry);
      if (!grouped[frontendEntry.category]) {
        grouped[frontendEntry.category] = [];
      }
      grouped[frontendEntry.category]!.push(frontendEntry);
    });

    return grouped as Record<KnowledgeCategory, KnowledgeEntry[]>;
  },

  // Get single entry
  getEntry: async (hotelId: string, entryId: string) => {
    const res = await apiClient.get<KnowledgeEntry>(`/hotels/${hotelId}/knowledge/${entryId}`);
    return mapToFrontend(res);
  },

  // Create entry
  createEntry: async (hotelId: string, data: CreateKnowledgeEntryDto) => {
    const res = await apiClient.post<KnowledgeEntry>(
      `/hotels/${hotelId}/knowledge`,
      mapToBackend({
        ...data,
        isActive: data.isActive ?? true,
        sortOrder: data.sortOrder ?? 0,
      })
    );
    return mapToFrontend(res);
  },

  // Update entry
  updateEntry: async (hotelId: string, entryId: string, data: Partial<UpdateKnowledgeEntryDto>) => {
    const res = await apiClient.put<KnowledgeEntry>(
      `/hotels/${hotelId}/knowledge/${entryId}`,
      mapToBackend(data as Partial<CreateKnowledgeEntryDto>)
    );
    return mapToFrontend(res);
  },

  // Delete entry
  deleteEntry: (hotelId: string, entryId: string) =>
    apiClient.delete<void>(`/hotels/${hotelId}/knowledge/${entryId}`),

  // Toggle active status
  toggleActive: async (hotelId: string, entryId: string) => {
    const entry = await apiClient.get<KnowledgeEntry>(`/hotels/${hotelId}/knowledge/${entryId}`);
    const res = await apiClient.put<KnowledgeEntry>(`/hotels/${hotelId}/knowledge/${entryId}`, {
      isActive: !entry.isActive,
    });
    return mapToFrontend(res);
  },

  // Bulk import entries
  bulkImport: (hotelId: string, entries: CreateKnowledgeEntryDto[]) => {
    const mappedEntries = entries.map((e) =>
      mapToBackend({
        ...e,
        isActive: e.isActive ?? true,
        sortOrder: e.sortOrder ?? 0,
      })
    );
    return apiClient.post<{ imported: number }>(`/hotels/${hotelId}/knowledge/bulk`, {
      entries: mappedEntries,
    });
  },

  // Get context for AI (used for testing/preview)
  getAIContext: (hotelId: string) => apiClient.get<string>(`/hotels/${hotelId}/knowledge/context`),
};

export type { KnowledgeFilters };

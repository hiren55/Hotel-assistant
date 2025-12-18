/**
 * Knowledge base type definitions
 */

export type KnowledgeCategory =
  | 'general'
  | 'rooms'
  | 'policies'
  | 'faqs'
  | 'location'
  | 'amenities'
  | 'services';

export interface KnowledgeEntry {
  id: string;
  hotelId: string;
  category: KnowledgeCategory;
  key: string;
  value: string;
  isActive: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateKnowledgeEntryDto {
  category: KnowledgeCategory;
  key: string;
  value: string;
  isActive?: boolean;
  sortOrder?: number;
}

export interface UpdateKnowledgeEntryDto {
  category?: KnowledgeCategory;
  key?: string;
  value?: string;
  isActive?: boolean;
  sortOrder?: number;
}

export interface HotelKnowledgeBase {
  hotelId: string;
  hotelName: string;
  entries: Record<KnowledgeCategory, KnowledgeEntry[]>;
}

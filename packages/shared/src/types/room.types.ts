/**
 * Room-related type definitions
 */

export type RoomStatus = 'active' | 'inactive' | 'maintenance';

export interface RoomAmenity {
  id: string;
  name: string;
  icon?: string;
}

export interface RoomImage {
  id: string;
  url: string;
  alt?: string;
  isPrimary: boolean;
}

export interface Room {
  id: string;
  hotelId: string;
  name: string;
  type: string;
  description?: string;
  capacity: number;
  basePrice: number;
  currency: string;
  amenities: RoomAmenity[];
  images: RoomImage[];
  status: RoomStatus;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateRoomDto {
  name: string;
  type: string;
  description?: string;
  capacity: number;
  basePrice: number;
  currency?: string;
  amenities?: RoomAmenity[];
  images?: Omit<RoomImage, 'id'>[];
  status?: RoomStatus;
  sortOrder?: number;
}

export interface UpdateRoomDto {
  name?: string;
  type?: string;
  description?: string;
  capacity?: number;
  basePrice?: number;
  currency?: string;
  amenities?: RoomAmenity[];
  images?: RoomImage[];
  status?: RoomStatus;
  sortOrder?: number;
}

export interface RoomAvailability {
  roomId: string;
  date: Date;
  isAvailable: boolean;
  price?: number;
}

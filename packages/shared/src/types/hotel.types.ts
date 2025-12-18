/**
 * Hotel-related type definitions
 */

export type HotelStatus = 'active' | 'suspended' | 'deleted';
export type SubscriptionTier = 'basic' | 'standard' | 'premium';
export type SubscriptionStatus = 'trial' | 'active' | 'past_due' | 'cancelled' | 'expired';

export interface HotelAddress {
  street: string;
  city: string;
  state?: string;
  country: string;
  postalCode: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
}

export interface HotelBranding {
  primaryColor?: string;
  logo?: string;
  welcomeMessage?: string;
  widgetPosition?: 'bottom-right' | 'bottom-left';
}

export interface HotelSettings {
  timezone: string;
  currency: string;
  language: string;
  checkInTime: string;
  checkOutTime: string;
  cancellationPolicy?: string;
  allowedDomains?: string[];
}

export interface Hotel {
  id: string;
  name: string;
  slug: string;
  subdomain?: string;
  email: string;
  phone?: string;
  address?: HotelAddress;
  settings: HotelSettings;
  branding: HotelBranding;
  status: HotelStatus;
  subscriptionTier: SubscriptionTier;
  subscriptionStatus: SubscriptionStatus;
  trialEndsAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateHotelDto {
  name: string;
  slug: string;
  email: string;
  phone?: string;
  address?: HotelAddress;
  settings?: Partial<HotelSettings>;
  branding?: Partial<HotelBranding>;
}

export interface UpdateHotelDto {
  name?: string;
  email?: string;
  phone?: string;
  address?: HotelAddress;
  settings?: Partial<HotelSettings>;
  branding?: Partial<HotelBranding>;
}

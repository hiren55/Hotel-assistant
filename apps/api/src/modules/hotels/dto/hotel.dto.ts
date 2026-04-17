import {
  IsEmail,
  IsObject,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AddressDto {
  @ApiPropertyOptional({ example: '123 Marine Drive' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  street?: string;

  @ApiPropertyOptional({ example: 'Mumbai' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string;

  @ApiPropertyOptional({ example: 'Maharashtra' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  state?: string;

  @ApiPropertyOptional({ example: '400001' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  postalCode?: string;

  @ApiPropertyOptional({ example: 'India' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  country?: string;
}

export class BrandingDto {
  @ApiPropertyOptional({ description: 'Primary brand color (hex)', example: '#1E40AF' })
  @IsOptional()
  @IsString()
  @Matches(/^#[0-9A-Fa-f]{6}$/, { message: 'Primary color must be a valid hex color' })
  primaryColor?: string;

  @ApiPropertyOptional({ description: 'Secondary brand color (hex)', example: '#F59E0B' })
  @IsOptional()
  @IsString()
  @Matches(/^#[0-9A-Fa-f]{6}$/, { message: 'Secondary color must be a valid hex color' })
  secondaryColor?: string;

  @ApiPropertyOptional({ description: 'Logo URL', example: 'https://example.com/logo.png' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  logoUrl?: string;

  @ApiPropertyOptional({ description: 'Welcome message for chat widget', example: 'Welcome to Grand Palace Hotel! How can I help you today?' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  welcomeMessage?: string;
}

export class HotelSettingsDto {
  @ApiPropertyOptional({ description: 'Default check-in time (HH:MM)', example: '14:00' })
  @IsOptional()
  @IsString()
  @Matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, { message: 'Check-in time must be in HH:MM format' })
  checkInTime?: string;

  @ApiPropertyOptional({ description: 'Default check-out time (HH:MM)', example: '11:00' })
  @IsOptional()
  @IsString()
  @Matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, { message: 'Check-out time must be in HH:MM format' })
  checkOutTime?: string;

  @ApiPropertyOptional({ description: 'Default currency code', example: 'INR' })
  @IsOptional()
  @IsString()
  @MaxLength(3)
  currency?: string;

  @ApiPropertyOptional({ description: 'Timezone', example: 'Asia/Kolkata' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  timezone?: string;

  @ApiPropertyOptional({ description: 'Cancellation policy text', example: 'Free cancellation up to 24 hours before check-in.' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  cancellationPolicy?: string;

  @ApiPropertyOptional({ description: 'Enable chat widget', example: true })
  @IsOptional()
  widgetEnabled?: boolean;

  @ApiPropertyOptional({ description: 'Enable booking via widget', example: true })
  @IsOptional()
  bookingEnabled?: boolean;
}

export class UpdateHotelDto {
  @ApiPropertyOptional({ description: 'Hotel name', example: 'Grand Palace Hotel' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(255)
  name?: string;

  @ApiPropertyOptional({ description: 'Contact email', example: 'info@grandpalace.com' })
  @IsOptional()
  @IsEmail()
  @MaxLength(255)
  email?: string;

  @ApiPropertyOptional({ description: 'Contact phone', example: '+91-9876543210' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  phone?: string;

  @ApiPropertyOptional({ description: 'Hotel address', type: AddressDto })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => AddressDto)
  address?: AddressDto;

  @ApiPropertyOptional({ description: 'Branding settings', type: BrandingDto })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => BrandingDto)
  branding?: BrandingDto;

  @ApiPropertyOptional({ description: 'Hotel settings', type: HotelSettingsDto })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => HotelSettingsDto)
  settings?: HotelSettingsDto;
}

export class HotelResponseDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  id: string;

  @ApiProperty({ example: 'Grand Palace Hotel' })
  name: string;

  @ApiProperty({ example: 'grand-palace-hotel' })
  slug: string;

  @ApiPropertyOptional({ example: 'grandpalace' })
  subdomain?: string;

  @ApiProperty({ example: 'info@grandpalace.com' })
  email: string;

  @ApiPropertyOptional({ example: '+91-9876543210' })
  phone?: string;

  @ApiPropertyOptional()
  address?: AddressDto;

  @ApiPropertyOptional()
  branding?: BrandingDto;

  @ApiPropertyOptional()
  settings?: HotelSettingsDto;

  @ApiProperty({ example: 'active' })
  status: string;

  @ApiProperty({ example: 'free' })
  subscriptionTier: string;

  @ApiProperty({ example: 'trialing' })
  subscriptionStatus: string;

  @ApiPropertyOptional({ example: '2026-03-28T00:00:00.000Z' })
  trialEndsAt?: Date;

  @ApiProperty({ example: '2026-02-28T00:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2026-02-28T00:00:00.000Z' })
  updatedAt: Date;
}

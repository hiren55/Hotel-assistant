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
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  street?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  state?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(20)
  postalCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  country?: string;
}

export class BrandingDto {
  @ApiPropertyOptional({ description: 'Primary brand color (hex)' })
  @IsOptional()
  @IsString()
  @Matches(/^#[0-9A-Fa-f]{6}$/, { message: 'Primary color must be a valid hex color' })
  primaryColor?: string;

  @ApiPropertyOptional({ description: 'Secondary brand color (hex)' })
  @IsOptional()
  @IsString()
  @Matches(/^#[0-9A-Fa-f]{6}$/, { message: 'Secondary color must be a valid hex color' })
  secondaryColor?: string;

  @ApiPropertyOptional({ description: 'Logo URL' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  logoUrl?: string;

  @ApiPropertyOptional({ description: 'Welcome message for chat widget' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  welcomeMessage?: string;
}

export class HotelSettingsDto {
  @ApiPropertyOptional({ description: 'Default check-in time (HH:MM)' })
  @IsOptional()
  @IsString()
  @Matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, { message: 'Check-in time must be in HH:MM format' })
  checkInTime?: string;

  @ApiPropertyOptional({ description: 'Default check-out time (HH:MM)' })
  @IsOptional()
  @IsString()
  @Matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, { message: 'Check-out time must be in HH:MM format' })
  checkOutTime?: string;

  @ApiPropertyOptional({ description: 'Default currency code' })
  @IsOptional()
  @IsString()
  @MaxLength(3)
  currency?: string;

  @ApiPropertyOptional({ description: 'Timezone' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  timezone?: string;

  @ApiPropertyOptional({ description: 'Cancellation policy text' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  cancellationPolicy?: string;

  @ApiPropertyOptional({ description: 'Enable chat widget' })
  @IsOptional()
  widgetEnabled?: boolean;

  @ApiPropertyOptional({ description: 'Enable booking via widget' })
  @IsOptional()
  bookingEnabled?: boolean;
}

export class UpdateHotelDto {
  @ApiPropertyOptional({ description: 'Hotel name' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(255)
  name?: string;

  @ApiPropertyOptional({ description: 'Contact email' })
  @IsOptional()
  @IsEmail()
  @MaxLength(255)
  email?: string;

  @ApiPropertyOptional({ description: 'Contact phone' })
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
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  slug: string;

  @ApiPropertyOptional()
  subdomain?: string;

  @ApiProperty()
  email: string;

  @ApiPropertyOptional()
  phone?: string;

  @ApiPropertyOptional()
  address?: AddressDto;

  @ApiPropertyOptional()
  branding?: BrandingDto;

  @ApiPropertyOptional()
  settings?: HotelSettingsDto;

  @ApiProperty()
  status: string;

  @ApiProperty()
  subscriptionTier: string;

  @ApiProperty()
  subscriptionStatus: string;

  @ApiPropertyOptional()
  trialEndsAt?: Date;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

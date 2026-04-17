import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({ example: 'hiren123@gmail.com', description: 'User email address' })
  @IsEmail({}, { message: 'Please provide a valid email address' })
  @IsNotEmpty({ message: 'Email is required' })
  @MaxLength(255, { message: 'Email must not exceed 255 characters' })
  email: string;

  @ApiProperty({ example: 'Hiren@123456', description: 'Password (min 12 chars, must include uppercase, lowercase, number, special char)' })
  @IsString({ message: 'Password must be a string' })
  @IsNotEmpty({ message: 'Password is required' })
  @MinLength(12, { message: 'Password must be at least 12 characters' })
  @MaxLength(128, { message: 'Password must not exceed 128 characters' })
  @Matches(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
    {
      message:
        'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
    },
  )
  password: string;

  @ApiProperty({ example: 'Hiren Patel', description: 'Full name of the user' })
  @IsString({ message: 'Name must be a string' })
  @IsNotEmpty({ message: 'Name is required' })
  @MinLength(2, { message: 'Name must be at least 2 characters' })
  @MaxLength(255, { message: 'Name must not exceed 255 characters' })
  name: string;

  @ApiPropertyOptional({ example: '550e8400-e29b-41d4-a716-446655440000', description: 'Hotel ID (UUID) if registering for a specific hotel' })
  @IsOptional()
  @IsUUID('4', { message: 'Hotel ID must be a valid UUID' })
  hotelId?: string;
}

export class RegisterHotelOwnerDto extends RegisterDto {
  @ApiProperty({ example: 'Grand Palace Hotel', description: 'Name of the hotel' })
  @IsString({ message: 'Hotel name must be a string' })
  @IsNotEmpty({ message: 'Hotel name is required' })
  @MinLength(2, { message: 'Hotel name must be at least 2 characters' })
  @MaxLength(255, { message: 'Hotel name must not exceed 255 characters' })
  hotelName: string;

  @ApiProperty({ example: 'grand-palace-hotel', description: 'URL-friendly slug (lowercase, numbers, hyphens only)' })
  @IsString({ message: 'Hotel slug must be a string' })
  @IsNotEmpty({ message: 'Hotel slug is required' })
  @MinLength(2, { message: 'Hotel slug must be at least 2 characters' })
  @MaxLength(100, { message: 'Hotel slug must not exceed 100 characters' })
  @Matches(/^[a-z0-9-]+$/, {
    message: 'Hotel slug can only contain lowercase letters, numbers, and hyphens',
  })
  hotelSlug: string;


}

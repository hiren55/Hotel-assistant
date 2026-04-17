/**
 * User-related type definitions
 */

export type UserRole = 'super_admin' | 'hotel_owner' | 'hotel_manager' | 'hotel_staff';
export type UserStatus = 'active' | 'inactive' | 'suspended';

export interface User {
  id: string;
  hotelId?: string;
  email: string;
  name: string;
  role: UserRole;
  jobTitle?: string;
  status: UserStatus;
  mfaEnabled: boolean;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateUserDto {
  email: string;
  password: string;
  name: string;
  role: UserRole;
  hotelId?: string;
  jobTitle?: string;
}

export interface UpdateUserDto {
  name?: string;
  email?: string;
  role?: UserRole;
  jobTitle?: string;
  status?: UserStatus;
}

export interface LoginCredentials {
  email: string;
  password: string;
  mfaCode?: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken?: string;
  expiresIn: number;
}

export interface JwtPayload {
  sub: string;
  tenantId?: string;
  role: UserRole;
  email: string;
  iat: number;
  exp: number;
  iss: string;
  aud: string;
}

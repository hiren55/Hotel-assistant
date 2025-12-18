import { IsNotEmpty, IsString } from 'class-validator';

export class RefreshTokenDto {
  @IsString({ message: 'Refresh token must be a string' })
  @IsNotEmpty({ message: 'Refresh token is required' })
  refreshToken: string;
}

export class TokenResponseDto {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: string;
}

export class AuthResponseDto {
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
    hotelId: string | null;
  };
  tokens: TokenResponseDto;
}

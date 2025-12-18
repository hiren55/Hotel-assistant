import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AuthService, SupabaseJwtPayload } from '../auth.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    private readonly authService: AuthService,
  ) {
    // Use Supabase JWT secret for token validation
    const supabaseJwtSecret = configService.get<string>('supabase.jwtSecret');
    const legacyJwtSecret = configService.get<string>('jwt.secret');

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      // Use Supabase JWT secret if available, otherwise fall back to legacy secret
      secretOrKey: supabaseJwtSecret || legacyJwtSecret,
      // Supabase tokens use 'authenticated' as audience
      audience: supabaseJwtSecret ? 'authenticated' : 'hotel-assistant-api',
      issuer: supabaseJwtSecret ? undefined : 'hotel-assistant',
    });
  }

  async validate(payload: SupabaseJwtPayload): Promise<any> {
    // Validate user exists in our database
    const user = await this.authService.validateUser(payload);

    if (!user) {
      throw new UnauthorizedException('Invalid token or user not found');
    }

    return user;
  }
}

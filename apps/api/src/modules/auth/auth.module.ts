import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { HotelAccessGuard } from './guards/hotel-access.guard';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        // Use Supabase JWT secret for token validation
        const supabaseJwtSecret = configService.get<string>('supabase.jwtSecret');
        const legacyJwtSecret = configService.get<string>('jwt.secret');

        return {
          secret: supabaseJwtSecret || legacyJwtSecret,
          signOptions: {
            expiresIn: configService.get<string>('jwt.accessTokenExpiresIn') || '1h',
          },
        };
      },
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
    JwtAuthGuard,
    RolesGuard,
    HotelAccessGuard,
  ],
  exports: [AuthService, JwtModule, JwtAuthGuard, RolesGuard, HotelAccessGuard],
})
export class AuthModule {}

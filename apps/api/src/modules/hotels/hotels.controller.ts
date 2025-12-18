import {
  Controller,
  Get,
  Put,
  Body,
  Param,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { HotelsService } from './hotels.service';
import { UpdateHotelDto, HotelResponseDto, HotelSettingsDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
  hotelId: string | null;
}

@ApiTags('hotels')
@ApiBearerAuth()
@Controller('hotels')
@UseGuards(JwtAuthGuard, RolesGuard)
export class HotelsController {
  constructor(private readonly hotelsService: HotelsService) {}

  @Get(':id')
  @ApiOperation({ summary: 'Get hotel details' })
  @ApiParam({ name: 'id', description: 'Hotel ID' })
  @ApiResponse({ status: 200, description: 'Hotel details', type: HotelResponseDto })
  @ApiResponse({ status: 404, description: 'Hotel not found' })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ): Promise<HotelResponseDto> {
    return this.hotelsService.findOne(id, user.id, user.role, user.hotelId);
  }

  @Put(':id')
  @Roles(UserRole.super_admin, UserRole.hotel_owner)
  @ApiOperation({ summary: 'Update hotel details' })
  @ApiParam({ name: 'id', description: 'Hotel ID' })
  @ApiResponse({ status: 200, description: 'Hotel updated', type: HotelResponseDto })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Hotel not found' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateHotelDto,
    @CurrentUser() user: AuthUser,
  ): Promise<HotelResponseDto> {
    return this.hotelsService.update(id, dto, user.id, user.role, user.hotelId);
  }

  @Get(':id/settings')
  @ApiOperation({ summary: 'Get hotel settings' })
  @ApiParam({ name: 'id', description: 'Hotel ID' })
  @ApiResponse({ status: 200, description: 'Hotel settings' })
  @ApiResponse({ status: 404, description: 'Hotel not found' })
  async getSettings(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ): Promise<any> {
    return this.hotelsService.getSettings(id, user.id, user.role, user.hotelId);
  }

  @Put(':id/settings')
  @Roles(UserRole.super_admin, UserRole.hotel_owner)
  @ApiOperation({ summary: 'Update hotel settings' })
  @ApiParam({ name: 'id', description: 'Hotel ID' })
  @ApiResponse({ status: 200, description: 'Settings updated' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Hotel not found' })
  async updateSettings(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() settings: HotelSettingsDto,
    @CurrentUser() user: AuthUser,
  ): Promise<any> {
    return this.hotelsService.updateSettings(id, settings, user.id, user.role, user.hotelId);
  }

  @Get(':id/stats')
  @ApiOperation({ summary: 'Get hotel statistics' })
  @ApiParam({ name: 'id', description: 'Hotel ID' })
  @ApiResponse({ status: 200, description: 'Hotel statistics' })
  @ApiResponse({ status: 404, description: 'Hotel not found' })
  async getStats(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ): Promise<any> {
    return this.hotelsService.getStats(id, user.role, user.hotelId);
  }
}

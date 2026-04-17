import {
  Controller,
  Get,
  Put,
  Body,
  Param,
  UseGuards,
  ParseUUIDPipe,
  NotFoundException,
  Post,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { HotelsService } from './hotels.service';
import { UpdateHotelDto, HotelResponseDto, HotelSettingsDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { StorageService } from '../storage/storage.service';

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
  constructor(
    private readonly hotelsService: HotelsService,
    private readonly storageService: StorageService,
  ) { }

  @Get('me')
  @ApiOperation({ summary: 'Get current user hotel details' })
  @ApiResponse({ status: 200, description: 'Hotel details', type: HotelResponseDto })
  @ApiResponse({ status: 404, description: 'Hotel not found' })
  async getMyHotel(
    @CurrentUser() user: AuthUser,
  ): Promise<HotelResponseDto> {
    if (!user.hotelId) {
      throw new NotFoundException('Hotel not found for current user');
    }
    return this.hotelsService.findOne(user.hotelId, user.id, user.role, user.hotelId);
  }

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

  @Post(':id/logo')
  @Roles(UserRole.super_admin, UserRole.hotel_owner)
  @ApiOperation({ summary: 'Upload hotel logo' })
  @ApiParam({ name: 'id', description: 'Hotel ID' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Logo uploaded successfully' })
  @ApiResponse({ status: 400, description: 'Bad request (e.g., file too large or wrong type)' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Hotel not found' })
  @UseInterceptors(FileInterceptor('file'))
  async uploadLogo(
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: AuthUser,
  ): Promise<{ logoUrl: string }> {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    try {
      const result = await this.storageService.uploadFile(
        file.buffer,
        file.originalname,
        file.mimetype,
        file.size,
        id,
        user.id,
      );

      // We should also update the hotel record with the new logo URL in the branding settings
      await this.hotelsService.updateSettings(
        id,
        { logoUrl: result.url },
        user.id,
        user.role,
        user.hotelId,
      );

      return { logoUrl: result.url };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error; // Re-throw the specific validation errors from StorageService
      }
      throw new BadRequestException('Failed to upload logo processing error');
    }
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

  @Get(':id/dashboard/summary')
  @ApiOperation({ summary: 'Get hotel dashboard summary' })
  @ApiParam({ name: 'id', description: 'Hotel ID' })
  @ApiResponse({ status: 200, description: 'Hotel dashboard summary' })
  @ApiResponse({ status: 404, description: 'Hotel not found' })
  async getDashboardSummary(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ): Promise<any> {
    return this.hotelsService.getDashboardSummary(id, user.role, user.hotelId);
  }
}

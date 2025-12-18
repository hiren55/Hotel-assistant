import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { RoomsService } from './rooms.service';
import {
  CreateRoomDto,
  UpdateRoomDto,
  UpdateRoomStatusDto,
  RoomQueryDto,
  RoomResponseDto,
  RoomListResponseDto,
} from './dto';
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

@ApiTags('rooms')
@ApiBearerAuth()
@Controller('hotels/:hotelId/rooms')
@UseGuards(JwtAuthGuard, RolesGuard)
export class RoomsController {
  constructor(private readonly roomsService: RoomsService) {}

  @Get()
  @ApiOperation({ summary: 'List rooms for a hotel' })
  @ApiParam({ name: 'hotelId', description: 'Hotel ID' })
  @ApiResponse({ status: 200, description: 'List of rooms', type: RoomListResponseDto })
  async findAll(
    @Param('hotelId', ParseUUIDPipe) hotelId: string,
    @Query() query: RoomQueryDto,
    @CurrentUser() user: AuthUser,
  ): Promise<RoomListResponseDto> {
    return this.roomsService.findAll(hotelId, query, user.role, user.hotelId);
  }

  @Post()
  @Roles(UserRole.super_admin, UserRole.hotel_owner, UserRole.hotel_manager)
  @ApiOperation({ summary: 'Create a new room' })
  @ApiParam({ name: 'hotelId', description: 'Hotel ID' })
  @ApiResponse({ status: 201, description: 'Room created', type: RoomResponseDto })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async create(
    @Param('hotelId', ParseUUIDPipe) hotelId: string,
    @Body() dto: CreateRoomDto,
    @CurrentUser() user: AuthUser,
  ): Promise<RoomResponseDto> {
    return this.roomsService.create(hotelId, dto, user.id, user.role, user.hotelId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get room details' })
  @ApiParam({ name: 'hotelId', description: 'Hotel ID' })
  @ApiParam({ name: 'id', description: 'Room ID' })
  @ApiResponse({ status: 200, description: 'Room details', type: RoomResponseDto })
  @ApiResponse({ status: 404, description: 'Room not found' })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ): Promise<RoomResponseDto> {
    return this.roomsService.findOne(id, user.role, user.hotelId);
  }

  @Put(':id')
  @Roles(UserRole.super_admin, UserRole.hotel_owner, UserRole.hotel_manager)
  @ApiOperation({ summary: 'Update room details' })
  @ApiParam({ name: 'hotelId', description: 'Hotel ID' })
  @ApiParam({ name: 'id', description: 'Room ID' })
  @ApiResponse({ status: 200, description: 'Room updated', type: RoomResponseDto })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Room not found' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateRoomDto,
    @CurrentUser() user: AuthUser,
  ): Promise<RoomResponseDto> {
    return this.roomsService.update(id, dto, user.id, user.role, user.hotelId);
  }

  @Put(':id/status')
  @Roles(UserRole.super_admin, UserRole.hotel_owner, UserRole.hotel_manager)
  @ApiOperation({ summary: 'Update room status' })
  @ApiParam({ name: 'hotelId', description: 'Hotel ID' })
  @ApiParam({ name: 'id', description: 'Room ID' })
  @ApiResponse({ status: 200, description: 'Room status updated', type: RoomResponseDto })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Room not found' })
  async updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateRoomStatusDto,
    @CurrentUser() user: AuthUser,
  ): Promise<RoomResponseDto> {
    return this.roomsService.updateStatus(id, dto, user.id, user.role, user.hotelId);
  }

  @Delete(':id')
  @Roles(UserRole.super_admin, UserRole.hotel_owner)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a room' })
  @ApiParam({ name: 'hotelId', description: 'Hotel ID' })
  @ApiParam({ name: 'id', description: 'Room ID' })
  @ApiResponse({ status: 204, description: 'Room deleted' })
  @ApiResponse({ status: 400, description: 'Room has active bookings' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Room not found' })
  async delete(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ): Promise<void> {
    return this.roomsService.delete(id, user.id, user.role, user.hotelId);
  }
}

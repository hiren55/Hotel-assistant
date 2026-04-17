import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
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
} from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreateTeamMemberDto, UpdateTeamMemberDto, TeamMemberResponseDto } from './dto/user.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('hotel-team')
@ApiBearerAuth()
@Controller('hotels/:hotelId/users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @Roles(UserRole.super_admin, UserRole.hotel_owner, UserRole.hotel_manager)
  @ApiOperation({ summary: 'List all team members for a hotel' })
  @ApiResponse({ status: 200, type: [TeamMemberResponseDto] })
  findAll(@Param('hotelId', ParseUUIDPipe) hotelId: string) {
    return this.usersService.findAll(hotelId);
  }

  @Get(':id')
  @Roles(UserRole.super_admin, UserRole.hotel_owner, UserRole.hotel_manager)
  @ApiOperation({ summary: 'Get a specific team member' })
  @ApiResponse({ status: 200, type: TeamMemberResponseDto })
  findOne(
    @Param('hotelId', ParseUUIDPipe) hotelId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.usersService.findOne(hotelId, id);
  }

  @Post()
  @Roles(UserRole.super_admin, UserRole.hotel_owner, UserRole.hotel_manager)
  @ApiOperation({ summary: 'Add a new team member' })
  @ApiResponse({ status: 201, type: TeamMemberResponseDto })
  create(
    @Param('hotelId', ParseUUIDPipe) hotelId: string,
    @Body() dto: CreateTeamMemberDto,
  ) {
    return this.usersService.create(hotelId, dto);
  }

  @Patch(':id')
  @Roles(UserRole.super_admin, UserRole.hotel_owner, UserRole.hotel_manager)
  @ApiOperation({ summary: 'Update a team member' })
  @ApiResponse({ status: 200, type: TeamMemberResponseDto })
  update(
    @Param('hotelId', ParseUUIDPipe) hotelId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTeamMemberDto,
  ) {
    return this.usersService.update(hotelId, id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.super_admin, UserRole.hotel_owner)
  @ApiOperation({ summary: 'Remove a team member' })
  @ApiResponse({ status: 204 })
  remove(
    @Param('hotelId', ParseUUIDPipe) hotelId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.usersService.remove(hotelId, id);
  }
}

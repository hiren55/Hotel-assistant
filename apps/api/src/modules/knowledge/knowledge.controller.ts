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
import { KnowledgeService } from './knowledge.service';
import {
  CreateKnowledgeDto,
  UpdateKnowledgeDto,
  KnowledgeQueryDto,
  KnowledgeResponseDto,
  KnowledgeListResponseDto,
  BulkCreateKnowledgeDto,
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

@ApiTags('knowledge')
@ApiBearerAuth()
@Controller('hotels/:hotelId/knowledge')
@UseGuards(JwtAuthGuard, RolesGuard)
export class KnowledgeController {
  constructor(private readonly knowledgeService: KnowledgeService) {}

  @Get()
  @ApiOperation({ summary: 'List knowledge entries for a hotel' })
  @ApiParam({ name: 'hotelId', description: 'Hotel ID' })
  @ApiResponse({ status: 200, description: 'List of knowledge entries', type: KnowledgeListResponseDto })
  async findAll(
    @Param('hotelId', ParseUUIDPipe) hotelId: string,
    @Query() query: KnowledgeQueryDto,
    @CurrentUser() user: AuthUser,
  ): Promise<KnowledgeListResponseDto> {
    return this.knowledgeService.findAll(hotelId, query, user.role, user.hotelId);
  }

  @Post()
  @Roles(UserRole.super_admin, UserRole.hotel_owner, UserRole.hotel_manager)
  @ApiOperation({ summary: 'Create a knowledge entry' })
  @ApiParam({ name: 'hotelId', description: 'Hotel ID' })
  @ApiResponse({ status: 201, description: 'Knowledge entry created', type: KnowledgeResponseDto })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 409, description: 'Duplicate key in category' })
  async create(
    @Param('hotelId', ParseUUIDPipe) hotelId: string,
    @Body() dto: CreateKnowledgeDto,
    @CurrentUser() user: AuthUser,
  ): Promise<KnowledgeResponseDto> {
    return this.knowledgeService.create(hotelId, dto, user.id, user.role, user.hotelId);
  }

  @Post('bulk')
  @Roles(UserRole.super_admin, UserRole.hotel_owner, UserRole.hotel_manager)
  @ApiOperation({ summary: 'Bulk create/update knowledge entries' })
  @ApiParam({ name: 'hotelId', description: 'Hotel ID' })
  @ApiResponse({ status: 201, description: 'Knowledge entries created/updated', type: [KnowledgeResponseDto] })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async bulkCreate(
    @Param('hotelId', ParseUUIDPipe) hotelId: string,
    @Body() dto: BulkCreateKnowledgeDto,
    @CurrentUser() user: AuthUser,
  ): Promise<KnowledgeResponseDto[]> {
    return this.knowledgeService.bulkCreate(hotelId, dto, user.id, user.role, user.hotelId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get knowledge entry details' })
  @ApiParam({ name: 'hotelId', description: 'Hotel ID' })
  @ApiParam({ name: 'id', description: 'Knowledge entry ID' })
  @ApiResponse({ status: 200, description: 'Knowledge entry details', type: KnowledgeResponseDto })
  @ApiResponse({ status: 404, description: 'Knowledge entry not found' })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ): Promise<KnowledgeResponseDto> {
    return this.knowledgeService.findOne(id, user.role, user.hotelId);
  }

  @Put(':id')
  @Roles(UserRole.super_admin, UserRole.hotel_owner, UserRole.hotel_manager)
  @ApiOperation({ summary: 'Update knowledge entry' })
  @ApiParam({ name: 'hotelId', description: 'Hotel ID' })
  @ApiParam({ name: 'id', description: 'Knowledge entry ID' })
  @ApiResponse({ status: 200, description: 'Knowledge entry updated', type: KnowledgeResponseDto })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Knowledge entry not found' })
  @ApiResponse({ status: 409, description: 'Duplicate key in category' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateKnowledgeDto,
    @CurrentUser() user: AuthUser,
  ): Promise<KnowledgeResponseDto> {
    return this.knowledgeService.update(id, dto, user.id, user.role, user.hotelId);
  }

  @Delete(':id')
  @Roles(UserRole.super_admin, UserRole.hotel_owner)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete knowledge entry' })
  @ApiParam({ name: 'hotelId', description: 'Hotel ID' })
  @ApiParam({ name: 'id', description: 'Knowledge entry ID' })
  @ApiResponse({ status: 204, description: 'Knowledge entry deleted' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Knowledge entry not found' })
  async delete(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ): Promise<void> {
    return this.knowledgeService.delete(id, user.id, user.role, user.hotelId);
  }
}

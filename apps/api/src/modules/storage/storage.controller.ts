import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { HotelAccessGuard } from '../auth/guards/hotel-access.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Throttle } from '@nestjs/throttler';
import { StorageService } from './storage.service';

/**
 * Storage Controller
 *
 * All storage operations are proxied through this controller.
 * Client NEVER receives direct storage URLs or credentials.
 *
 * Security:
 * - All endpoints require authentication
 * - All endpoints verify tenant access
 * - Returns signed URLs with short expiration
 * - Audit logging for all operations
 */
@ApiTags('storage')
@Controller('storage')
@UseGuards(JwtAuthGuard, RolesGuard, HotelAccessGuard)
@ApiBearerAuth()
export class StorageController {
  constructor(private readonly storageService: StorageService) {}

  /**
   * Get a signed URL for downloading a file
   * This is the ONLY way clients can access files
   */
  @Get('files/:hotelId/:fileId/url')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get signed download URL',
    description: 'Get a time-limited signed URL for downloading a file. URL expires in 5 minutes.',
  })
  @ApiResponse({ status: 200, description: 'Signed URL generated' })
  @ApiResponse({ status: 404, description: 'File not found' })
  @Throttle({ default: { limit: 60, ttl: 60000 } }) // 60 requests per minute
  async getDownloadUrl(
    @Param('hotelId') hotelId: string,
    @Param('fileId') fileId: string,
    @CurrentUser() user: any,
  ) {
    const result = await this.storageService.getSignedDownloadUrl(fileId, user.id, hotelId);

    return {
      data: {
        url: result.url,
        expiresIn: result.expiresIn,
        expiresAt: result.expiresAt.toISOString(),
      },
    };
  }

  /**
   * Request a signed URL for uploading a file
   * Validates file type and size before providing upload URL
   */
  @Post('files/:hotelId/upload-url')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Request upload URL',
    description: 'Get a signed URL for uploading a file. URL expires in 5 minutes.',
  })
  @ApiResponse({ status: 200, description: 'Upload URL generated' })
  @ApiResponse({ status: 400, description: 'Invalid file type or size' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @Throttle({ default: { limit: 20, ttl: 60000 } }) // 20 requests per minute
  async requestUploadUrl(
    @Param('hotelId') hotelId: string,
    @Body() body: { fileName: string; mimeType: string; size: number },
    @CurrentUser() user: any,
  ) {
    const result = await this.storageService.getSignedUploadUrl({
      fileName: body.fileName,
      mimeType: body.mimeType,
      size: body.size,
      hotelId,
      userId: user.id,
    });

    return {
      data: {
        uploadUrl: result.url,
        fileId: result.fileId,
        path: result.path,
        expiresIn: result.expiresIn,
        expiresAt: result.expiresAt.toISOString(),
      },
    };
  }

  /**
   * Delete a file
   */
  @Delete('files/:hotelId/:fileId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Delete a file',
    description: 'Delete a file from storage',
  })
  @ApiResponse({ status: 200, description: 'File deleted' })
  @ApiResponse({ status: 404, description: 'File not found' })
  @Throttle({ default: { limit: 20, ttl: 60000 } }) // 20 requests per minute
  async deleteFile(
    @Param('hotelId') hotelId: string,
    @Param('fileId') fileId: string,
    @CurrentUser() user: any,
  ) {
    await this.storageService.deleteFile(fileId, user.id, hotelId);

    return {
      data: {
        message: 'File deleted successfully',
      },
    };
  }

  /**
   * List files for a hotel
   */
  @Get('files/:hotelId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'List files',
    description: 'List files for a hotel with pagination',
  })
  @ApiResponse({ status: 200, description: 'Files listed' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @Throttle({ default: { limit: 30, ttl: 60000 } }) // 30 requests per minute
  async listFiles(
    @Param('hotelId') hotelId: string,
    @Query('limit') limit: string = '100',
    @Query('offset') offset: string = '0',
    @CurrentUser() user: any,
  ) {
    const result = await this.storageService.listFiles(
      hotelId,
      user.id,
      parseInt(limit, 10),
      parseInt(offset, 10),
    );

    return {
      data: {
        files: result.files,
        total: result.total,
        limit: parseInt(limit, 10),
        offset: parseInt(offset, 10),
      },
    };
  }
}

import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { SupabaseService } from '../../supabase/supabase.service';

/**
 * Secure Storage Service
 *
 * All storage operations are proxied through this service.
 * Client NEVER gets direct access to storage URLs or credentials.
 *
 * Security principles:
 * - Server-side proxy for all file operations
 * - Signed URLs with short expiration for client access
 * - Tenant isolation enforced
 * - Audit logging for all access
 */

export interface FileMetadata {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  bucket: string;
  path: string;
  hotelId: string;
  uploadedBy: string;
  createdAt: Date;
}

export interface UploadRequest {
  fileName: string;
  mimeType: string;
  size: number;
  hotelId: string;
  userId: string;
}

export interface SignedUrlResponse {
  url: string;
  expiresIn: number;
  expiresAt: Date;
}

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);

  // Allowed MIME types for upload
  private readonly allowedMimeTypes = [
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'application/pdf',
    'text/plain',
    'text/csv',
  ];

  // Maximum file size (10MB)
  private readonly maxFileSize = 10 * 1024 * 1024;

  // Default signed URL expiration (5 minutes)
  private readonly signedUrlExpiry = 300;

  // Storage bucket name
  private readonly bucketName: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly supabase: SupabaseService,
    private readonly configService: ConfigService,
  ) {
    this.bucketName = this.configService.get<string>('STORAGE_BUCKET_NAME') || 'hotel-files';
  }

  /**
   * Verify user has access to the specified hotel
   */
  async verifyTenantAccess(userId: string, hotelId: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return false;
    }

    // Super admin has access to all
    if (user.role === 'super_admin') {
      return true;
    }

    // User must belong to the hotel
    return user.hotelId === hotelId;
  }

  /**
   * Get a signed URL for downloading a file
   * This is the ONLY way clients can access files
   */
  async getSignedDownloadUrl(
    fileId: string,
    userId: string,
    hotelId: string,
  ): Promise<SignedUrlResponse> {
    // Verify tenant access
    const hasAccess = await this.verifyTenantAccess(userId, hotelId);
    if (!hasAccess) {
      // Return 404 to prevent enumeration
      throw new NotFoundException('File not found');
    }

    // In a real implementation, you would have a files table
    // For now, construct the path from fileId
    const filePath = `${hotelId}/${fileId}`;

    try {
      const supabaseClient = this.supabase.getAdminClient();

      const { data, error } = await supabaseClient.storage
        .from(this.bucketName)
        .createSignedUrl(filePath, this.signedUrlExpiry);

      if (error) {
        this.logger.error('Failed to create signed URL', error);
        throw new NotFoundException('File not found');
      }

      // Log access
      await this.logStorageAccess(userId, hotelId, fileId, 'download');

      return {
        url: data.signedUrl,
        expiresIn: this.signedUrlExpiry,
        expiresAt: new Date(Date.now() + this.signedUrlExpiry * 1000),
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error('Storage access error', error);
      throw new NotFoundException('File not found');
    }
  }

  /**
   * Get a signed URL for uploading a file
   * Validates file type and size before providing upload URL
   */
  async getSignedUploadUrl(request: UploadRequest): Promise<SignedUrlResponse & { fileId: string; path: string }> {
    // Verify tenant access
    const hasAccess = await this.verifyTenantAccess(request.userId, request.hotelId);
    if (!hasAccess) {
      throw new ForbiddenException('Access denied');
    }

    // Validate MIME type
    if (!this.allowedMimeTypes.includes(request.mimeType)) {
      throw new BadRequestException(
        `Invalid file type. Allowed types: ${this.allowedMimeTypes.join(', ')}`,
      );
    }

    // Validate file size
    if (request.size > this.maxFileSize) {
      throw new BadRequestException(
        `File too large. Maximum size: ${this.maxFileSize / 1024 / 1024}MB`,
      );
    }

    // Sanitize filename
    const sanitizedName = this.sanitizeFileName(request.fileName);

    // Generate unique file ID
    const fileId = crypto.randomUUID();

    // Construct secure path: hotelId/fileId/filename
    const filePath = `${request.hotelId}/${fileId}/${sanitizedName}`;

    try {
      const supabaseClient = this.supabase.getAdminClient();

      const { data, error } = await supabaseClient.storage
        .from(this.bucketName)
        .createSignedUploadUrl(filePath);

      if (error) {
        this.logger.error('Failed to create upload URL', error);
        throw new BadRequestException('Failed to prepare upload');
      }

      // Log upload request
      await this.logStorageAccess(request.userId, request.hotelId, fileId, 'upload_request');

      return {
        url: data.signedUrl,
        fileId,
        path: filePath,
        expiresIn: this.signedUrlExpiry,
        expiresAt: new Date(Date.now() + this.signedUrlExpiry * 1000),
      };
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof ForbiddenException) {
        throw error;
      }
      this.logger.error('Upload URL generation error', error);
      throw new BadRequestException('Failed to prepare upload');
    }
  }

  /**
   * Delete a file from storage
   */
  async deleteFile(fileId: string, userId: string, hotelId: string): Promise<void> {
    // Verify tenant access
    const hasAccess = await this.verifyTenantAccess(userId, hotelId);
    if (!hasAccess) {
      throw new NotFoundException('File not found');
    }

    const filePath = `${hotelId}/${fileId}`;

    try {
      const supabaseClient = this.supabase.getAdminClient();

      // List files in the directory to get actual filename
      const { data: files, error: listError } = await supabaseClient.storage
        .from(this.bucketName)
        .list(filePath);

      if (listError || !files?.length) {
        throw new NotFoundException('File not found');
      }

      // Delete all files in the directory (should be just one)
      const filesToDelete = files.map(f => `${filePath}/${f.name}`);

      const { error } = await supabaseClient.storage
        .from(this.bucketName)
        .remove(filesToDelete);

      if (error) {
        this.logger.error('Failed to delete file', error);
        throw new BadRequestException('Failed to delete file');
      }

      // Log deletion
      await this.logStorageAccess(userId, hotelId, fileId, 'delete');
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error('File deletion error', error);
      throw new BadRequestException('Failed to delete file');
    }
  }

  /**
   * List files for a hotel (with pagination)
   */
  async listFiles(
    hotelId: string,
    userId: string,
    limit: number = 100,
    offset: number = 0,
  ): Promise<{ files: { name: string; id: string; size: number }[]; total: number }> {
    // Verify tenant access
    const hasAccess = await this.verifyTenantAccess(userId, hotelId);
    if (!hasAccess) {
      throw new ForbiddenException('Access denied');
    }

    try {
      const supabaseClient = this.supabase.getAdminClient();

      const { data: folders, error } = await supabaseClient.storage
        .from(this.bucketName)
        .list(hotelId, {
          limit,
          offset,
        });

      if (error) {
        this.logger.error('Failed to list files', error);
        return { files: [], total: 0 };
      }

      const files = folders
        .filter(f => f.id) // Filter out non-files
        .map(f => ({
          name: f.name,
          id: f.name, // The folder name IS the file ID in our structure
          size: f.metadata?.size || 0,
        }));

      return {
        files,
        total: files.length,
      };
    } catch (error) {
      this.logger.error('File listing error', error);
      return { files: [], total: 0 };
    }
  }

  /**
   * Sanitize filename to prevent path traversal and other attacks
   */
  private sanitizeFileName(fileName: string): string {
    // Remove path components
    let sanitized = fileName.replace(/^.*[\\\/]/, '');

    // Remove special characters except alphanumeric, dash, underscore, dot
    sanitized = sanitized.replace(/[^a-zA-Z0-9\-_\.]/g, '_');

    // Ensure it's not empty
    if (!sanitized || sanitized === '.' || sanitized === '..') {
      sanitized = 'file';
    }

    // Limit length
    if (sanitized.length > 255) {
      const ext = sanitized.split('.').pop() || '';
      sanitized = sanitized.substring(0, 250 - ext.length) + '.' + ext;
    }

    return sanitized;
  }

  /**
   * Log storage access for audit trail
   */
  private async logStorageAccess(
    userId: string,
    hotelId: string,
    fileId: string,
    action: string,
  ): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          userId,
          hotelId,
          action: `storage_${action}`,
          entityType: 'file',
          entityId: fileId,
        },
      });
    } catch (error) {
      // Don't fail the main operation if audit log fails
      this.logger.warn('Failed to create storage audit log', error);
    }
  }
}

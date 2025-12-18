import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateKnowledgeDto,
  UpdateKnowledgeDto,
  KnowledgeQueryDto,
  KnowledgeResponseDto,
  KnowledgeListResponseDto,
  BulkCreateKnowledgeDto,
} from './dto';
import { UserRole, KnowledgeCategory } from '@prisma/client';

@Injectable()
export class KnowledgeService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    hotelId: string,
    query: KnowledgeQueryDto,
    userRole: UserRole,
    userHotelId: string | null,
  ): Promise<KnowledgeListResponseDto> {
    if (userRole !== UserRole.super_admin && userHotelId !== hotelId) {
      throw new NotFoundException('Hotel not found');
    }

    const { page = 1, limit = 50, category, isActive, search } = query;
    const skip = (page - 1) * limit;

    const where: any = { hotelId };
    if (category) where.category = category;
    if (isActive !== undefined) where.isActive = isActive;
    if (search) {
      where.OR = [
        { key: { contains: search, mode: 'insensitive' } },
        { value: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [entries, total] = await Promise.all([
      this.prisma.hotelKnowledge.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ category: 'asc' }, { sortOrder: 'asc' }, { key: 'asc' }],
      }),
      this.prisma.hotelKnowledge.count({ where }),
    ]);

    return {
      data: entries.map(this.toResponseDto),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findByCategory(
    hotelId: string,
    category: KnowledgeCategory,
  ): Promise<KnowledgeResponseDto[]> {
    const entries = await this.prisma.hotelKnowledge.findMany({
      where: {
        hotelId,
        category,
        isActive: true,
      },
      orderBy: [{ sortOrder: 'asc' }, { key: 'asc' }],
    });

    return entries.map(this.toResponseDto);
  }

  async findAllActive(hotelId: string): Promise<KnowledgeResponseDto[]> {
    const entries = await this.prisma.hotelKnowledge.findMany({
      where: {
        hotelId,
        isActive: true,
      },
      orderBy: [{ category: 'asc' }, { sortOrder: 'asc' }],
    });

    return entries.map(this.toResponseDto);
  }

  async findOne(
    id: string,
    userRole: UserRole,
    userHotelId: string | null,
  ): Promise<KnowledgeResponseDto> {
    const entry = await this.prisma.hotelKnowledge.findUnique({
      where: { id },
    });

    if (!entry) {
      throw new NotFoundException('Knowledge entry not found');
    }

    if (userRole !== UserRole.super_admin && userHotelId !== entry.hotelId) {
      throw new NotFoundException('Knowledge entry not found');
    }

    return this.toResponseDto(entry);
  }

  async create(
    hotelId: string,
    dto: CreateKnowledgeDto,
    userId: string,
    userRole: UserRole,
    userHotelId: string | null,
  ): Promise<KnowledgeResponseDto> {
    if (
      userRole !== UserRole.super_admin &&
      userRole !== UserRole.hotel_owner &&
      userRole !== UserRole.hotel_manager
    ) {
      throw new ForbiddenException('Not authorized to create knowledge entries');
    }

    if (userRole !== UserRole.super_admin && userHotelId !== hotelId) {
      throw new NotFoundException('Hotel not found');
    }

    // Check for duplicate key in same category
    const existing = await this.prisma.hotelKnowledge.findUnique({
      where: {
        hotelId_category_key: {
          hotelId,
          category: dto.category,
          key: dto.key,
        },
      },
    });

    if (existing) {
      throw new ConflictException('A knowledge entry with this key already exists in this category');
    }

    const entry = await this.prisma.hotelKnowledge.create({
      data: {
        hotelId,
        category: dto.category,
        key: dto.key,
        value: dto.value,
        isActive: dto.isActive ?? true,
        sortOrder: dto.sortOrder ?? 0,
      },
    });

    await this.createAuditLog(hotelId, userId, 'create_knowledge', 'knowledge', entry.id, dto);

    return this.toResponseDto(entry);
  }

  async bulkCreate(
    hotelId: string,
    dto: BulkCreateKnowledgeDto,
    userId: string,
    userRole: UserRole,
    userHotelId: string | null,
  ): Promise<KnowledgeResponseDto[]> {
    if (
      userRole !== UserRole.super_admin &&
      userRole !== UserRole.hotel_owner &&
      userRole !== UserRole.hotel_manager
    ) {
      throw new ForbiddenException('Not authorized to create knowledge entries');
    }

    if (userRole !== UserRole.super_admin && userHotelId !== hotelId) {
      throw new NotFoundException('Hotel not found');
    }

    const entries = await this.prisma.$transaction(
      dto.entries.map((entry) =>
        this.prisma.hotelKnowledge.upsert({
          where: {
            hotelId_category_key: {
              hotelId,
              category: entry.category,
              key: entry.key,
            },
          },
          update: {
            value: entry.value,
            isActive: entry.isActive ?? true,
            sortOrder: entry.sortOrder ?? 0,
          },
          create: {
            hotelId,
            category: entry.category,
            key: entry.key,
            value: entry.value,
            isActive: entry.isActive ?? true,
            sortOrder: entry.sortOrder ?? 0,
          },
        }),
      ),
    );

    await this.createAuditLog(hotelId, userId, 'bulk_create_knowledge', 'knowledge', hotelId, {
      count: entries.length,
    });

    return entries.map(this.toResponseDto);
  }

  async update(
    id: string,
    dto: UpdateKnowledgeDto,
    userId: string,
    userRole: UserRole,
    userHotelId: string | null,
  ): Promise<KnowledgeResponseDto> {
    const entry = await this.prisma.hotelKnowledge.findUnique({
      where: { id },
    });

    if (!entry) {
      throw new NotFoundException('Knowledge entry not found');
    }

    if (userRole !== UserRole.super_admin && userHotelId !== entry.hotelId) {
      throw new NotFoundException('Knowledge entry not found');
    }

    if (
      userRole !== UserRole.super_admin &&
      userRole !== UserRole.hotel_owner &&
      userRole !== UserRole.hotel_manager
    ) {
      throw new ForbiddenException('Not authorized to update knowledge entries');
    }

    // If changing key or category, check for duplicates
    if (dto.key || dto.category) {
      const newKey = dto.key || entry.key;
      const newCategory = dto.category || entry.category;

      const existing = await this.prisma.hotelKnowledge.findFirst({
        where: {
          hotelId: entry.hotelId,
          category: newCategory,
          key: newKey,
          id: { not: id },
        },
      });

      if (existing) {
        throw new ConflictException('A knowledge entry with this key already exists in this category');
      }
    }

    const updatedEntry = await this.prisma.hotelKnowledge.update({
      where: { id },
      data: {
        ...(dto.category && { category: dto.category }),
        ...(dto.key && { key: dto.key }),
        ...(dto.value && { value: dto.value }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
        ...(dto.sortOrder !== undefined && { sortOrder: dto.sortOrder }),
      },
    });

    await this.createAuditLog(entry.hotelId, userId, 'update_knowledge', 'knowledge', id, dto);

    return this.toResponseDto(updatedEntry);
  }

  async delete(
    id: string,
    userId: string,
    userRole: UserRole,
    userHotelId: string | null,
  ): Promise<void> {
    const entry = await this.prisma.hotelKnowledge.findUnique({
      where: { id },
    });

    if (!entry) {
      throw new NotFoundException('Knowledge entry not found');
    }

    if (userRole !== UserRole.super_admin && userHotelId !== entry.hotelId) {
      throw new NotFoundException('Knowledge entry not found');
    }

    if (
      userRole !== UserRole.super_admin &&
      userRole !== UserRole.hotel_owner
    ) {
      throw new ForbiddenException('Not authorized to delete knowledge entries');
    }

    await this.prisma.hotelKnowledge.delete({
      where: { id },
    });

    await this.createAuditLog(entry.hotelId, userId, 'delete_knowledge', 'knowledge', id);
  }

  async getKnowledgeContext(hotelId: string): Promise<string> {
    const entries = await this.prisma.hotelKnowledge.findMany({
      where: {
        hotelId,
        isActive: true,
      },
      orderBy: [{ category: 'asc' }, { sortOrder: 'asc' }],
    });

    // Group by category
    const grouped = entries.reduce<Record<string, string[]>>((acc, entry) => {
      if (!acc[entry.category]) {
        acc[entry.category] = [];
      }
      acc[entry.category]!.push(`${entry.key}: ${entry.value}`);
      return acc;
    }, {});

    // Format as context string
    const sections = Object.entries(grouped).map(([category, items]) => {
      const categoryTitle = category.charAt(0).toUpperCase() + category.slice(1);
      return `## ${categoryTitle}\n${items.join('\n')}`;
    });

    return sections.join('\n\n');
  }

  private toResponseDto(entry: any): KnowledgeResponseDto {
    return {
      id: entry.id,
      hotelId: entry.hotelId,
      category: entry.category,
      key: entry.key,
      value: entry.value,
      isActive: entry.isActive,
      sortOrder: entry.sortOrder,
      createdAt: entry.createdAt,
      updatedAt: entry.updatedAt,
    };
  }

  private async createAuditLog(
    hotelId: string,
    userId: string,
    action: string,
    entityType: string,
    entityId: string,
    changes?: any,
  ): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          hotelId,
          userId,
          action,
          entityType,
          entityId,
          changes: changes ? JSON.parse(JSON.stringify(changes)) : null,
        },
      });
    } catch (error) {
      console.error('Failed to create audit log:', error);
    }
  }
}

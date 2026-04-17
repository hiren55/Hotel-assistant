import { Injectable, NotFoundException, ConflictException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UserRole, UserStatus } from '@prisma/client';
import { CreateTeamMemberDto, UpdateTeamMemberDto, TeamMemberResponseDto } from './dto/user.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(hotelId: string): Promise<TeamMemberResponseDto[]> {
    const users = await this.prisma.user.findMany({
      where: { hotelId },
      orderBy: { createdAt: 'desc' },
    });

    return users.map((user) => this.toResponseDto(user));
  }

  async findOne(hotelId: string, id: string): Promise<TeamMemberResponseDto> {
    const user = await this.prisma.user.findFirst({
      where: { id, hotelId },
    });

    if (!user) {
      throw new NotFoundException('Team member not found');
    }

    return this.toResponseDto(user);
  }

  async create(hotelId: string, dto: CreateTeamMemberDto): Promise<TeamMemberResponseDto> {
    const existingUser = await this.prisma.user.findFirst({
      where: { email: dto.email.toLowerCase() },
    });

    if (existingUser) {
      throw new ConflictException('Email already registered');
    }

    // For demo purposes, we'll use a default password 'Hotel@123'
    // In production, we would send an invitation email
    const defaultPassword = 'Hotel@123';
    const passwordHash = await bcrypt.hash(defaultPassword, 12);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email.toLowerCase(),
        passwordHash,
        name: dto.name,
        role: dto.role,
        jobTitle: dto.jobTitle,
        hotelId,
        status: UserStatus.active, // Defaulting to active for demo speed
      },
    });

    return this.toResponseDto(user);
  }

  async update(hotelId: string, id: string, dto: UpdateTeamMemberDto): Promise<TeamMemberResponseDto> {
    const user = await this.prisma.user.findFirst({
      where: { id, hotelId },
    });

    if (!user) {
      throw new NotFoundException('Team member not found');
    }

    // Don't allow changing owner role if it's the last owner
    if (user.role === UserRole.hotel_owner && dto.role && dto.role !== UserRole.hotel_owner) {
      const ownersCount = await this.prisma.user.count({
        where: { hotelId, role: UserRole.hotel_owner },
      });
      if (ownersCount <= 1) {
        throw new ForbiddenException('Cannot change the role of the last hotel owner');
      }
    }

    const updatedUser = await this.prisma.user.update({
      where: { id },
      data: {
        ...(dto.name && { name: dto.name }),
        ...(dto.role && { role: dto.role }),
        ...(dto.jobTitle !== undefined && { jobTitle: dto.jobTitle }),
        ...(dto.status && { status: dto.status }),
      },
    });

    return this.toResponseDto(updatedUser);
  }

  async remove(hotelId: string, id: string): Promise<void> {
    const user = await this.prisma.user.findFirst({
      where: { id, hotelId },
    });

    if (!user) {
      throw new NotFoundException('Team member not found');
    }

    if (user.role === UserRole.hotel_owner) {
      const ownersCount = await this.prisma.user.count({
        where: { hotelId, role: UserRole.hotel_owner },
      });
      if (ownersCount <= 1) {
        throw new ForbiddenException('Cannot remove the last hotel owner');
      }
    }

    await this.prisma.user.delete({
      where: { id },
    });
  }

  private toResponseDto(user: any): TeamMemberResponseDto {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      jobTitle: user.jobTitle,
      status: user.status,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
    };
  }
}

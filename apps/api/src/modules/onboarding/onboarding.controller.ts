import {
    Controller,
    Get,
    Post,
    UseGuards,
} from '@nestjs/common';
import {
    ApiTags,
    ApiOperation,
    ApiResponse,
    ApiBearerAuth,
} from '@nestjs/swagger';
import { OnboardingService } from './onboarding.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';

interface AuthUser {
    id: string;
    email: string;
    role: UserRole;
    hotelId: string | null;
}

@ApiTags('onboarding')
@Controller('onboarding')
export class OnboardingController {
    constructor(private readonly onboardingService: OnboardingService) { }

    @Get('status')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Check if user has completed onboarding' })
    @ApiResponse({
        status: 200,
        description: 'Onboarding status',
        schema: {
            type: 'object',
            properties: {
                complete: { type: 'boolean', example: false },
                hotelId: { type: 'string', example: '550e8400-e29b-41d4-a716-446655440000', nullable: true },
            },
        },
    })
    async getStatus(@CurrentUser() user: AuthUser) {
        return this.onboardingService.getOnboardingStatus(user.id);
    }

    @Post('complete')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Mark onboarding as complete' })
    @ApiResponse({
        status: 200,
        description: 'Onboarding marked as complete',
        schema: {
            type: 'object',
            properties: {
                complete: { type: 'boolean', example: true },
            },
        },
    })
    async completeOnboarding(@CurrentUser() user: AuthUser) {
        return this.onboardingService.completeOnboarding(user.id);
    }
}

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class OnboardingService {
    private readonly logger = new Logger(OnboardingService.name);

    constructor(private readonly prisma: PrismaService) { }

    /**
     * Check if a user has completed onboarding.
     */
    async getOnboardingStatus(userId: string): Promise<{ complete: boolean; hotelId: string | null }> {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: { onboardingComplete: true, hotelId: true },
        });

        return {
            complete: user?.onboardingComplete ?? true,
            hotelId: user?.hotelId ?? null,
        };
    }

    /**
     * Mark onboarding as complete for a user.
     */
    async completeOnboarding(userId: string): Promise<{ complete: boolean }> {
        await this.prisma.user.update({
            where: { id: userId },
            data: { onboardingComplete: true },
        });

        this.logger.log(`User ${userId} completed onboarding`);

        return { complete: true };
    }
}

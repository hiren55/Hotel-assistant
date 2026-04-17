-- Migration: add_onboarding_and_hotel_fields
-- Description: Adds onboardingComplete flag to users, and description/website to hotels

-- Add onboarding_complete column to users table (defaults to true for existing users)
ALTER TABLE "users" ADD COLUMN "onboarding_complete" BOOLEAN NOT NULL DEFAULT true;

-- Add description and website columns to hotels table
ALTER TABLE "hotels" ADD COLUMN "description" TEXT;
ALTER TABLE "hotels" ADD COLUMN "website" VARCHAR(2048);

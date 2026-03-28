-- CreateEnum
CREATE TYPE "mood_type" AS ENUM ('HAPPY', 'ENERGETIC', 'RELAXED', 'EXCITED', 'TIRED', 'STRESSED', 'ANXIOUS', 'SAD', 'DEPRESSED', 'ANGRY');

-- AlterEnum
ALTER TYPE "user_role" ADD VALUE 'ADMIN';

-- AlterTable
ALTER TABLE "inventory_items" ADD COLUMN     "restockFrequencyDays" INTEGER DEFAULT 7;

-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "createdBy" TEXT,
ADD COLUMN     "moodFeedbackGiven" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "mood_settings" (
    "id" TEXT NOT NULL,
    "mood" "mood_type" NOT NULL,
    "emoji" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "supportMessage" TEXT,
    "scientificExplanation" TEXT,
    "beneficialNutrients" TEXT,
    "preferredCategories" TEXT,
    "excludeCategories" TEXT,
    "preferredCategoryPoints" INTEGER NOT NULL DEFAULT 10,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mood_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mood_feedback_config" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "baselineThreshold" INTEGER NOT NULL DEFAULT 50,
    "feedbackEnabled" BOOLEAN NOT NULL DEFAULT false,
    "autoEnableFeedback" BOOLEAN NOT NULL DEFAULT true,
    "orderRateWeight" DOUBLE PRECISION NOT NULL DEFAULT 0.6,
    "feedbackRateWeight" DOUBLE PRECISION NOT NULL DEFAULT 0.4,
    "moodBenefitsWeight" INTEGER NOT NULL DEFAULT 20,
    "preferredCategoryWeight" INTEGER NOT NULL DEFAULT 10,
    "featuredItemWeight" INTEGER NOT NULL DEFAULT 5,
    "priceRangeWeight" INTEGER NOT NULL DEFAULT 5,
    "historicalDataWeight" INTEGER NOT NULL DEFAULT 15,
    "timeOfDayWeight" INTEGER NOT NULL DEFAULT 5,
    "showMoodReflection" BOOLEAN NOT NULL DEFAULT true,
    "reflectionDelayMinutes" INTEGER NOT NULL DEFAULT 15,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mood_feedback_config_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mood_order_stats" (
    "id" TEXT NOT NULL,
    "mood" "mood_type" NOT NULL,
    "totalShown" INTEGER NOT NULL DEFAULT 0,
    "totalOrdered" INTEGER NOT NULL DEFAULT 0,
    "feedbackCount" INTEGER NOT NULL DEFAULT 0,
    "moodImproved" INTEGER NOT NULL DEFAULT 0,
    "moodSame" INTEGER NOT NULL DEFAULT 0,
    "moodWorse" INTEGER NOT NULL DEFAULT 0,
    "baselineReached" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mood_order_stats_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "mood_settings_mood_key" ON "mood_settings"("mood");

-- CreateIndex
CREATE INDEX "mood_settings_mood_idx" ON "mood_settings"("mood");

-- CreateIndex
CREATE INDEX "mood_settings_isActive_idx" ON "mood_settings"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "mood_order_stats_mood_key" ON "mood_order_stats"("mood");

-- CreateIndex
CREATE INDEX "mood_order_stats_mood_idx" ON "mood_order_stats"("mood");

-- CreateIndex
CREATE INDEX "mood_order_stats_baselineReached_idx" ON "mood_order_stats"("baselineReached");

-- CreateIndex
CREATE INDEX "orders_createdBy_idx" ON "orders"("createdBy");

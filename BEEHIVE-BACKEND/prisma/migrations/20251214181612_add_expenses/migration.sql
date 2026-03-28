-- CreateEnum
CREATE TYPE "expense_category" AS ENUM ('RENT_LEASE', 'UTILITIES', 'ADMINISTRATIVE_SALARIES', 'SOFTWARE_SUBSCRIPTIONS', 'MAINTENANCE', 'OTHER');

-- CreateEnum
CREATE TYPE "expense_frequency" AS ENUM ('ONE_TIME', 'MONTHLY', 'QUARTERLY', 'ANNUAL');

-- CreateTable
CREATE TABLE "expenses" (
    "id" TEXT NOT NULL,
    "category" "expense_category" NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "description" TEXT NOT NULL,
    "frequency" "expense_frequency" NOT NULL,
    "attachment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "expenses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "expenses_date_idx" ON "expenses"("date");

-- CreateIndex
CREATE INDEX "expenses_category_idx" ON "expenses"("category");

-- CreateIndex
CREATE INDEX "expenses_frequency_idx" ON "expenses"("frequency");

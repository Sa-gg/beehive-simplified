-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "category" AS ENUM ('PIZZA', 'APPETIZER', 'HOT_DRINKS', 'COLD_DRINKS', 'SMOOTHIE', 'PLATTER', 'SAVERS', 'VALUE_MEAL');

-- CreateEnum
CREATE TYPE "order_type" AS ENUM ('DINE_IN', 'TAKEOUT', 'DELIVERY');

-- CreateEnum
CREATE TYPE "order_status" AS ENUM ('PENDING', 'PREPARING', 'READY', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "payment_status" AS ENUM ('UNPAID', 'PAID', 'REFUNDED', 'COMPLIMENTARY', 'WRITTEN_OFF', 'VOIDED');

-- CreateEnum
CREATE TYPE "user_role" AS ENUM ('CUSTOMER', 'CASHIER', 'COOK', 'MANAGER', 'ADMIN');

-- CreateEnum
CREATE TYPE "inventory_category" AS ENUM ('INGREDIENTS', 'BEVERAGES', 'PACKAGING', 'SUPPLIES');

-- CreateEnum
CREATE TYPE "inventory_status" AS ENUM ('IN_STOCK', 'LOW_STOCK', 'OUT_OF_STOCK');

-- CreateEnum
CREATE TYPE "expense_category" AS ENUM ('RENT_LEASE', 'UTILITIES', 'ADMINISTRATIVE_SALARIES', 'SOFTWARE_SUBSCRIPTIONS', 'MAINTENANCE', 'OTHER');

-- CreateEnum
CREATE TYPE "expense_frequency" AS ENUM ('ONE_TIME', 'MONTHLY', 'QUARTERLY', 'ANNUAL');

-- CreateEnum
CREATE TYPE "stock_transaction_type" AS ENUM ('IN', 'OUT');

-- CreateEnum
CREATE TYPE "stock_transaction_reason" AS ENUM ('PURCHASE', 'ORDER', 'WASTE', 'ADJUSTMENT', 'RECONCILIATION', 'VOID');

-- CreateEnum
CREATE TYPE "mood_type" AS ENUM ('HAPPY', 'ENERGETIC', 'RELAXED', 'EXCITED', 'TIRED', 'STRESSED', 'ANXIOUS', 'SAD', 'DEPRESSED', 'ANGRY');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "user_role" NOT NULL DEFAULT 'CUSTOMER',
    "phone" TEXT,
    "loyaltyPoints" INTEGER NOT NULL DEFAULT 0,
    "cardNumber" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastLoginAt" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "menu_items" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" "category" NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "cost" DOUBLE PRECISION DEFAULT 0,
    "image" TEXT,
    "description" TEXT,
    "available" BOOLEAN NOT NULL DEFAULT true,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "prepTime" INTEGER DEFAULT 5,
    "nutrients" TEXT,
    "moodBenefits" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "menu_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_items" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "menuItemId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "subtotal" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orders" (
    "id" TEXT NOT NULL,
    "orderNumber" TEXT NOT NULL,
    "customerName" TEXT,
    "tableNumber" TEXT,
    "orderType" "order_type" NOT NULL DEFAULT 'DINE_IN',
    "status" "order_status" NOT NULL DEFAULT 'PENDING',
    "subtotal" DOUBLE PRECISION NOT NULL,
    "tax" DOUBLE PRECISION NOT NULL,
    "discountAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalAmount" DOUBLE PRECISION NOT NULL,
    "paymentMethod" TEXT,
    "paymentStatus" "payment_status" NOT NULL DEFAULT 'UNPAID',
    "moodContext" TEXT,
    "moodFeedbackGiven" BOOLEAN NOT NULL DEFAULT false,
    "linkedOrderId" TEXT,
    "createdBy" TEXT,
    "processedBy" TEXT,
    "deviceId" TEXT,
    "notes" TEXT,
    "authorizedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_items" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" "inventory_category" NOT NULL,
    "currentStock" DOUBLE PRECISION NOT NULL,
    "minStock" DOUBLE PRECISION NOT NULL,
    "maxStock" DOUBLE PRECISION NOT NULL,
    "unit" TEXT NOT NULL,
    "costPerUnit" DOUBLE PRECISION NOT NULL,
    "supplier" TEXT NOT NULL,
    "status" "inventory_status" NOT NULL DEFAULT 'IN_STOCK',
    "restockFrequencyDays" INTEGER DEFAULT 7,
    "lastRestocked" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inventory_items_pkey" PRIMARY KEY ("id")
);

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

-- CreateTable
CREATE TABLE "stock_transactions" (
    "id" TEXT NOT NULL,
    "inventoryItemId" TEXT NOT NULL,
    "type" "stock_transaction_type" NOT NULL,
    "reason" "stock_transaction_reason" NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "referenceId" TEXT,
    "userId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stock_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "menu_item_ingredients" (
    "id" TEXT NOT NULL,
    "menuItemId" TEXT NOT NULL,
    "inventoryItemId" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "menu_item_ingredients_pkey" PRIMARY KEY ("id")
);

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
    "excludedCategoryPenalty" INTEGER NOT NULL DEFAULT 0,
    "featuredItemWeight" INTEGER NOT NULL DEFAULT 5,
    "priceRangeWeight" INTEGER NOT NULL DEFAULT 5,
    "historicalDataWeight" INTEGER NOT NULL DEFAULT 15,
    "timeOfDayWeight" INTEGER NOT NULL DEFAULT 5,
    "explorationBonusWeight" INTEGER NOT NULL DEFAULT 8,
    "minimumOrdersThreshold" INTEGER NOT NULL DEFAULT 10,
    "day0PositionShuffle" BOOLEAN NOT NULL DEFAULT true,
    "morningStartHour" INTEGER NOT NULL DEFAULT 6,
    "morningEndHour" INTEGER NOT NULL DEFAULT 12,
    "afternoonEndHour" INTEGER NOT NULL DEFAULT 18,
    "morningCategories" TEXT NOT NULL DEFAULT '["HOT_DRINKS"]',
    "afternoonCategories" TEXT NOT NULL DEFAULT '[]',
    "eveningCategories" TEXT NOT NULL DEFAULT '["HOT_DRINKS","PLATTER"]',
    "showMoodReflection" BOOLEAN NOT NULL DEFAULT true,
    "reflectionDelayMinutes" INTEGER NOT NULL DEFAULT 15,
    "showRankingNumbers" BOOLEAN NOT NULL DEFAULT false,
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

-- CreateTable
CREATE TABLE "menu_item_mood_stats" (
    "id" TEXT NOT NULL,
    "menuItemId" TEXT NOT NULL,
    "mood" "mood_type" NOT NULL,
    "timesShown" INTEGER NOT NULL DEFAULT 0,
    "timesOrdered" INTEGER NOT NULL DEFAULT 0,
    "feedbackCount" INTEGER NOT NULL DEFAULT 0,
    "moodImproved" INTEGER NOT NULL DEFAULT 0,
    "moodSame" INTEGER NOT NULL DEFAULT 0,
    "moodWorse" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "menu_item_mood_stats_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_cardNumber_key" ON "users"("cardNumber");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_role_idx" ON "users"("role");

-- CreateIndex
CREATE INDEX "users_cardNumber_idx" ON "users"("cardNumber");

-- CreateIndex
CREATE INDEX "menu_items_available_idx" ON "menu_items"("available");

-- CreateIndex
CREATE INDEX "menu_items_category_idx" ON "menu_items"("category");

-- CreateIndex
CREATE INDEX "menu_items_featured_idx" ON "menu_items"("featured");

-- CreateIndex
CREATE INDEX "order_items_menuItemId_idx" ON "order_items"("menuItemId");

-- CreateIndex
CREATE INDEX "order_items_orderId_idx" ON "order_items"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "orders_orderNumber_key" ON "orders"("orderNumber");

-- CreateIndex
CREATE INDEX "orders_createdAt_idx" ON "orders"("createdAt");

-- CreateIndex
CREATE INDEX "orders_status_idx" ON "orders"("status");

-- CreateIndex
CREATE INDEX "orders_linkedOrderId_idx" ON "orders"("linkedOrderId");

-- CreateIndex
CREATE INDEX "orders_createdBy_idx" ON "orders"("createdBy");

-- CreateIndex
CREATE INDEX "orders_deviceId_idx" ON "orders"("deviceId");

-- CreateIndex
CREATE INDEX "orders_processedBy_idx" ON "orders"("processedBy");

-- CreateIndex
CREATE INDEX "orders_paymentStatus_idx" ON "orders"("paymentStatus");

-- CreateIndex
CREATE INDEX "inventory_items_category_idx" ON "inventory_items"("category");

-- CreateIndex
CREATE INDEX "inventory_items_status_idx" ON "inventory_items"("status");

-- CreateIndex
CREATE INDEX "expenses_date_idx" ON "expenses"("date");

-- CreateIndex
CREATE INDEX "expenses_category_idx" ON "expenses"("category");

-- CreateIndex
CREATE INDEX "expenses_frequency_idx" ON "expenses"("frequency");

-- CreateIndex
CREATE INDEX "stock_transactions_inventoryItemId_idx" ON "stock_transactions"("inventoryItemId");

-- CreateIndex
CREATE INDEX "stock_transactions_type_idx" ON "stock_transactions"("type");

-- CreateIndex
CREATE INDEX "stock_transactions_reason_idx" ON "stock_transactions"("reason");

-- CreateIndex
CREATE INDEX "stock_transactions_referenceId_idx" ON "stock_transactions"("referenceId");

-- CreateIndex
CREATE INDEX "stock_transactions_createdAt_idx" ON "stock_transactions"("createdAt");

-- CreateIndex
CREATE INDEX "menu_item_ingredients_menuItemId_idx" ON "menu_item_ingredients"("menuItemId");

-- CreateIndex
CREATE INDEX "menu_item_ingredients_inventoryItemId_idx" ON "menu_item_ingredients"("inventoryItemId");

-- CreateIndex
CREATE UNIQUE INDEX "menu_item_ingredients_menuItemId_inventoryItemId_key" ON "menu_item_ingredients"("menuItemId", "inventoryItemId");

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
CREATE INDEX "menu_item_mood_stats_menuItemId_idx" ON "menu_item_mood_stats"("menuItemId");

-- CreateIndex
CREATE INDEX "menu_item_mood_stats_mood_idx" ON "menu_item_mood_stats"("mood");

-- CreateIndex
CREATE UNIQUE INDEX "menu_item_mood_stats_menuItemId_mood_key" ON "menu_item_mood_stats"("menuItemId", "mood");

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_menuItemId_fkey" FOREIGN KEY ("menuItemId") REFERENCES "menu_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_transactions" ADD CONSTRAINT "stock_transactions_inventoryItemId_fkey" FOREIGN KEY ("inventoryItemId") REFERENCES "inventory_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "menu_item_ingredients" ADD CONSTRAINT "menu_item_ingredients_menuItemId_fkey" FOREIGN KEY ("menuItemId") REFERENCES "menu_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "menu_item_ingredients" ADD CONSTRAINT "menu_item_ingredients_inventoryItemId_fkey" FOREIGN KEY ("inventoryItemId") REFERENCES "inventory_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "menu_item_mood_stats" ADD CONSTRAINT "menu_item_mood_stats_menuItemId_fkey" FOREIGN KEY ("menuItemId") REFERENCES "menu_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;


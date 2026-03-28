-- CreateEnum
CREATE TYPE "stock_transaction_type" AS ENUM ('IN', 'OUT');

-- CreateEnum
CREATE TYPE "stock_transaction_reason" AS ENUM ('PURCHASE', 'ORDER', 'WASTE', 'ADJUSTMENT', 'RECONCILIATION');

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

-- AddForeignKey
ALTER TABLE "stock_transactions" ADD CONSTRAINT "stock_transactions_inventoryItemId_fkey" FOREIGN KEY ("inventoryItemId") REFERENCES "inventory_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "menu_item_ingredients" ADD CONSTRAINT "menu_item_ingredients_menuItemId_fkey" FOREIGN KEY ("menuItemId") REFERENCES "menu_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "menu_item_ingredients" ADD CONSTRAINT "menu_item_ingredients_inventoryItemId_fkey" FOREIGN KEY ("inventoryItemId") REFERENCES "inventory_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

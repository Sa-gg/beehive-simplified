-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "linkedOrderId" TEXT;

-- CreateIndex
CREATE INDEX "orders_linkedOrderId_idx" ON "orders"("linkedOrderId");

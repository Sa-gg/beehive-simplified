-- CreateEnum
CREATE TYPE "order_type" AS ENUM ('DINE_IN', 'TAKEOUT', 'DELIVERY');

-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "orderType" "order_type" NOT NULL DEFAULT 'DINE_IN';

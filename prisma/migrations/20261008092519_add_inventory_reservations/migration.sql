-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "inventoryStatus" TEXT NOT NULL DEFAULT 'NONE',
ADD COLUMN     "reservationExpiresAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "reservedStock" INTEGER NOT NULL DEFAULT 0;

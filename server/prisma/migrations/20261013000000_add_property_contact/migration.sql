-- AlterTable
ALTER TABLE "Property" ADD COLUMN     "contactPhone" TEXT,
ADD COLUMN     "languages" TEXT[] DEFAULT ARRAY[]::TEXT[];

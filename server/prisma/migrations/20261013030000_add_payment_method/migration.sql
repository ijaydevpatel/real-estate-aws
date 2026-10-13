-- CreateTable
CREATE TABLE "PaymentMethod" (
    "id" SERIAL NOT NULL,
    "tenantCognitoId" TEXT NOT NULL,
    "cardBrand" TEXT NOT NULL,
    "last4" TEXT NOT NULL,
    "expiryMonth" INTEGER NOT NULL,
    "expiryYear" INTEGER NOT NULL,
    "billingEmail" TEXT NOT NULL,

    CONSTRAINT "PaymentMethod_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PaymentMethod_tenantCognitoId_key" ON "PaymentMethod"("tenantCognitoId");

-- AddForeignKey
ALTER TABLE "PaymentMethod" ADD CONSTRAINT "PaymentMethod_tenantCognitoId_fkey" FOREIGN KEY ("tenantCognitoId") REFERENCES "Tenant"("cognitoId") ON DELETE RESTRICT ON UPDATE CASCADE;

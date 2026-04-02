-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_DeliveryNote" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "deliveryNoteNumber" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "quotationId" TEXT,
    "invoiceId" TEXT,
    "issueDate" DATETIME NOT NULL,
    "deliveryDate" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "subtotal" INTEGER NOT NULL DEFAULT 0,
    "taxAmount10" INTEGER NOT NULL DEFAULT 0,
    "taxAmount8" INTEGER NOT NULL DEFAULT 0,
    "totalAmount" INTEGER NOT NULL DEFAULT 0,
    "subject" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "DeliveryNote_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "DeliveryNote_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_DeliveryNote" ("createdAt", "customerId", "deliveryDate", "deliveryNoteNumber", "id", "issueDate", "notes", "quotationId", "status", "subject", "subtotal", "taxAmount10", "taxAmount8", "totalAmount", "updatedAt") SELECT "createdAt", "customerId", "deliveryDate", "deliveryNoteNumber", "id", "issueDate", "notes", "quotationId", "status", "subject", "subtotal", "taxAmount10", "taxAmount8", "totalAmount", "updatedAt" FROM "DeliveryNote";
DROP TABLE "DeliveryNote";
ALTER TABLE "new_DeliveryNote" RENAME TO "DeliveryNote";
CREATE UNIQUE INDEX "DeliveryNote_deliveryNoteNumber_key" ON "DeliveryNote"("deliveryNoteNumber");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

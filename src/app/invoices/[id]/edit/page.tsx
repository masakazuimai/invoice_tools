import { notFound } from "next/navigation"
import { prisma } from "@/lib/db"
import { PageHeader } from "@/components/layout/page-header"
import { InvoiceForm } from "@/components/invoices/invoice-form"
import type { TaxRate } from "@/lib/tax-calculator"

type Props = { params: Promise<{ id: string }> }

export default async function EditInvoicePage({ params }: Props) {
  const { id } = await params
  const invoice = await prisma.invoice.findUnique({
    where: { id },
    include: { items: { orderBy: { sortOrder: "asc" } } },
  })

  if (!invoice) notFound()
  if (invoice.status !== "draft") notFound()

  return (
    <div className="space-y-6">
      <PageHeader title={`請求書を編集 ${invoice.invoiceNumber}`} />
      <InvoiceForm
        initialData={{
          id: invoice.id,
          customerId: invoice.customerId,
          issueDate: invoice.issueDate.toISOString().split("T")[0],
          dueDate: invoice.dueDate.toISOString().split("T")[0],
          items: invoice.items.map((item) => ({
            itemId: item.itemId ?? undefined,
            name: item.name,
            quantity: item.quantity,
            unit: item.unit,
            unitPrice: item.unitPrice,
            taxRate: item.taxRate as TaxRate,
          })),
          notes: invoice.notes ?? "",
        }}
      />
    </div>
  )
}

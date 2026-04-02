import { notFound } from "next/navigation"
import { prisma } from "@/lib/db"
import { PageHeader } from "@/components/layout/page-header"
import { QuotationForm } from "@/components/quotations/quotation-form"
import type { TaxRate } from "@/lib/tax-calculator"

type Props = { params: Promise<{ id: string }> }

export default async function EditQuotationPage({ params }: Props) {
  const { id } = await params
  const quotation = await prisma.quotation.findUnique({
    where: { id },
    include: { items: { orderBy: { sortOrder: "asc" } } },
  })

  if (!quotation) notFound()
  if (quotation.status !== "draft") notFound()

  return (
    <div className="space-y-6">
      <PageHeader title={`見積書を編集 ${quotation.quotationNumber}`} />
      <QuotationForm
        initialData={{
          id: quotation.id,
          customerId: quotation.customerId,
          issueDate: quotation.issueDate.toISOString().split("T")[0],
          validUntil: quotation.validUntil.toISOString().split("T")[0],
          subject: quotation.subject ?? "",
          items: quotation.items.map((item) => ({
            itemId: item.itemId ?? undefined,
            name: item.name,
            quantity: item.quantity,
            unit: item.unit,
            unitPrice: item.unitPrice,
            taxRate: item.taxRate as TaxRate,
          })),
          notes: quotation.notes ?? "",
        }}
      />
    </div>
  )
}

import { notFound } from "next/navigation"
import { prisma } from "@/lib/db"
import { PageHeader } from "@/components/layout/page-header"
import { DeliveryNoteForm } from "@/components/delivery-notes/delivery-note-form"
import type { TaxRate } from "@/lib/tax-calculator"

type Props = { params: Promise<{ id: string }> }

export default async function EditDeliveryNotePage({ params }: Props) {
  const { id } = await params
  const deliveryNote = await prisma.deliveryNote.findUnique({
    where: { id },
    include: { items: { orderBy: { sortOrder: "asc" } } },
  })

  if (!deliveryNote) notFound()
  if (deliveryNote.status !== "draft") notFound()

  return (
    <div className="space-y-6">
      <PageHeader title={`納品書を編集 ${deliveryNote.deliveryNoteNumber}`} />
      <DeliveryNoteForm
        initialData={{
          id: deliveryNote.id,
          customerId: deliveryNote.customerId,
          issueDate: deliveryNote.issueDate.toISOString().split("T")[0],
          deliveryDate: deliveryNote.deliveryDate.toISOString().split("T")[0],
          subject: deliveryNote.subject ?? "",
          items: deliveryNote.items.map((item) => ({
            itemId: item.itemId ?? undefined,
            name: item.name,
            quantity: item.quantity,
            unit: item.unit,
            unitPrice: item.unitPrice,
            taxRate: item.taxRate as TaxRate,
          })),
          notes: deliveryNote.notes ?? "",
        }}
      />
    </div>
  )
}

import { notFound } from "next/navigation"
import { prisma } from "@/lib/db"
import { PageHeader } from "@/components/layout/page-header"
import { ItemForm } from "@/components/items/item-form"
import type { TaxRate } from "@/lib/tax-calculator"

type Props = { params: Promise<{ id: string }> }

export default async function EditItemPage({ params }: Props) {
  const { id } = await params
  const item = await prisma.item.findUnique({ where: { id } })

  if (!item) notFound()

  return (
    <div className="space-y-6">
      <PageHeader title="品目を編集" />
      <ItemForm
        initialData={{
          id: item.id,
          name: item.name,
          unitPrice: item.unitPrice,
          unit: item.unit,
          taxRate: item.taxRate as TaxRate,
          description: item.description ?? "",
        }}
      />
    </div>
  )
}

import { PageHeader } from "@/components/layout/page-header"
import { ItemForm } from "@/components/items/item-form"

export default function NewItemPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="品目を作成" />
      <ItemForm />
    </div>
  )
}

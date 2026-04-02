import { PageHeader } from "@/components/layout/page-header"
import { DeliveryNoteForm } from "@/components/delivery-notes/delivery-note-form"

export default function NewDeliveryNotePage() {
  return (
    <div className="space-y-6">
      <PageHeader title="納品書を作成" />
      <DeliveryNoteForm />
    </div>
  )
}

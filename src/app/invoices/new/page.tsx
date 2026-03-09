import { PageHeader } from "@/components/layout/page-header"
import { InvoiceForm } from "@/components/invoices/invoice-form"

export default function NewInvoicePage() {
  return (
    <div className="space-y-6">
      <PageHeader title="請求書を作成" />
      <InvoiceForm />
    </div>
  )
}

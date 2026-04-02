import { PageHeader } from "@/components/layout/page-header"
import { QuotationForm } from "@/components/quotations/quotation-form"

export default function NewQuotationPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="見積書を作成" />
      <QuotationForm />
    </div>
  )
}

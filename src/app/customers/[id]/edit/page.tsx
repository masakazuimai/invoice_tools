import { notFound } from "next/navigation"
import { prisma } from "@/lib/db"
import { PageHeader } from "@/components/layout/page-header"
import { CustomerForm } from "@/components/customers/customer-form"

type Props = { params: Promise<{ id: string }> }

export default async function EditCustomerPage({ params }: Props) {
  const { id } = await params
  const customer = await prisma.customer.findUnique({ where: { id } })

  if (!customer) notFound()

  return (
    <div className="space-y-6">
      <PageHeader title="顧客を編集" />
      <CustomerForm
        initialData={{
          id: customer.id,
          name: customer.name,
          zipCode: customer.zipCode ?? "",
          address: customer.address ?? "",
          phone: customer.phone ?? "",
          email: customer.email ?? "",
          contactPerson: customer.contactPerson ?? "",
          memo: customer.memo ?? "",
        }}
      />
    </div>
  )
}

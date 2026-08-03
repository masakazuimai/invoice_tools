import Link from "next/link"
import { prisma } from "@/lib/db"
import { PageHeader } from "@/components/layout/page-header"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"

export const dynamic = "force-dynamic"

export default async function CustomersPage() {
  const customers = await prisma.customer.findMany({
    orderBy: { updatedAt: "desc" },
    include: { _count: { select: { invoices: true } } },
  })

  return (
    <div className="space-y-6">
      <PageHeader
        title="顧客管理"
        description={`${customers.length}件の顧客`}
        actions={
          <Link href="/customers/new">
            <Button>新規作成</Button>
          </Link>
        }
      />
      <Card className="p-0 overflow-hidden">
        <table className="w-full text-base">
          <thead className="border-b bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left font-medium text-gray-600">顧客名</th>
              <th className="px-6 py-3 text-left font-medium text-gray-600">代表者</th>
              <th className="px-6 py-3 text-left font-medium text-gray-600">メール</th>
              <th className="px-6 py-3 text-left font-medium text-gray-600">請求書数</th>
              <th className="px-6 py-3 text-right font-medium text-gray-600">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {customers.map((customer) => (
              <tr key={customer.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 font-medium text-gray-900">{customer.name}</td>
                <td className="px-6 py-4 text-gray-600">{customer.contactPerson ?? "-"}</td>
                <td className="px-6 py-4 text-gray-600">{customer.email ?? "-"}</td>
                <td className="px-6 py-4 text-gray-600">{customer._count.invoices}</td>
                <td className="px-6 py-4 text-right tabular-nums">
                  <Link href={`/customers/${customer.id}/edit`} className="text-blue-600 hover:text-blue-800">
                    編集
                  </Link>
                </td>
              </tr>
            ))}
            {customers.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                  顧客がまだ登録されていません
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  )
}

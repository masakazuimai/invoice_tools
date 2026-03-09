import Link from "next/link"
import { prisma } from "@/lib/db"
import { PageHeader } from "@/components/layout/page-header"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { formatCurrency, formatDateJP, formatStatus, statusColor } from "@/lib/format"

export const dynamic = "force-dynamic"

export default async function InvoicesPage() {
  const invoices = await prisma.invoice.findMany({
    include: { customer: true },
    orderBy: { createdAt: "desc" },
  })

  return (
    <div className="space-y-6">
      <PageHeader
        title="請求書一覧"
        description={`${invoices.length}件の請求書`}
        actions={
          <Link href="/invoices/new">
            <Button>新規作成</Button>
          </Link>
        }
      />
      <Card className="p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left font-medium text-gray-500">請求書番号</th>
              <th className="px-6 py-3 text-left font-medium text-gray-500">顧客</th>
              <th className="px-6 py-3 text-left font-medium text-gray-500">発行日</th>
              <th className="px-6 py-3 text-left font-medium text-gray-500">支払期限</th>
              <th className="px-6 py-3 text-right font-medium text-gray-500">金額</th>
              <th className="px-6 py-3 text-left font-medium text-gray-500">ステータス</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {invoices.map((invoice) => (
              <tr key={invoice.id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <Link href={`/invoices/${invoice.id}`} className="font-medium text-blue-600 hover:text-blue-800">
                    {invoice.invoiceNumber}
                  </Link>
                </td>
                <td className="px-6 py-4 text-gray-900">{invoice.customer.name}</td>
                <td className="px-6 py-4 text-gray-600">{formatDateJP(invoice.issueDate)}</td>
                <td className="px-6 py-4 text-gray-600">{formatDateJP(invoice.dueDate)}</td>
                <td className="px-6 py-4 text-right font-medium text-gray-900">
                  {formatCurrency(invoice.totalAmount)}
                </td>
                <td className="px-6 py-4">
                  <Badge className={statusColor(invoice.status)}>
                    {formatStatus(invoice.status)}
                  </Badge>
                </td>
              </tr>
            ))}
            {invoices.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                  請求書がまだ作成されていません
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  )
}

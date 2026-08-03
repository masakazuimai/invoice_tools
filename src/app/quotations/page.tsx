import Link from "next/link"
import { prisma } from "@/lib/db"
import { PageHeader } from "@/components/layout/page-header"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { formatCurrency, formatDateJP, formatStatus, statusColor } from "@/lib/format"

export const dynamic = "force-dynamic"

export default async function QuotationsPage() {
  const quotations = await prisma.quotation.findMany({
    include: { customer: true },
    orderBy: { createdAt: "desc" },
  })

  return (
    <div className="space-y-6">
      <PageHeader
        title="見積書一覧"
        description={`${quotations.length}件の見積書`}
        actions={
          <Link href="/quotations/new">
            <Button>新規作成</Button>
          </Link>
        }
      />
      <Card className="p-0 overflow-x-auto">
        <table className="w-full min-w-max text-fluid">
          <thead className="border-b bg-gray-50">
            <tr>
              <th className="whitespace-nowrap px-cell py-3 text-left font-medium text-gray-600">見積書番号</th>
              <th className="whitespace-nowrap px-cell py-3 text-left font-medium text-gray-600">顧客</th>
              <th className="whitespace-nowrap px-cell py-3 text-left font-medium text-gray-600">件名</th>
              <th className="whitespace-nowrap px-cell py-3 text-left font-medium text-gray-600">発行日</th>
              <th className="whitespace-nowrap px-cell py-3 text-left font-medium text-gray-600">有効期限</th>
              <th className="whitespace-nowrap px-cell py-3 text-right font-medium text-gray-600">金額</th>
              <th className="whitespace-nowrap px-cell py-3 text-left font-medium text-gray-600">ステータス</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {quotations.map((q) => (
              <tr key={q.id} className="hover:bg-gray-50">
                <td className="whitespace-nowrap px-cell py-4">
                  <Link href={`/quotations/${q.id}`} className="font-medium text-blue-600 hover:text-blue-800">
                    {q.quotationNumber}
                  </Link>
                </td>
                <td className="px-cell py-4 text-gray-900">{q.customer.name}</td>
                <td className="px-cell py-4 text-gray-600">{q.subject ?? "-"}</td>
                <td className="whitespace-nowrap px-cell py-4 text-gray-600">{formatDateJP(q.issueDate)}</td>
                <td className="whitespace-nowrap px-cell py-4 text-gray-600">{formatDateJP(q.validUntil)}</td>
                <td className="whitespace-nowrap px-cell py-4 text-right font-medium text-gray-900 tabular-nums">
                  {formatCurrency(q.totalAmount)}
                </td>
                <td className="whitespace-nowrap px-cell py-4">
                  <Badge className={statusColor(q.status)}>
                    {formatStatus(q.status)}
                  </Badge>
                </td>
              </tr>
            ))}
            {quotations.length === 0 && (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                  見積書がまだ作成されていません
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  )
}

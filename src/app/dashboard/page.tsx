import Link from "next/link"
import { prisma } from "@/lib/db"
import { PageHeader } from "@/components/layout/page-header"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { formatCurrency, formatDateJP, formatStatus, statusColor } from "@/lib/format"

export const dynamic = "force-dynamic"

export default async function DashboardPage() {
  const now = new Date()

  // 期限超過の請求書を自動更新
  await prisma.invoice.updateMany({
    where: {
      status: "sent",
      dueDate: { lt: now },
    },
    data: { status: "overdue" },
  })

  // 集計データ取得
  const [invoices, counts] = await Promise.all([
    prisma.invoice.findMany({
      include: { customer: true },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
    prisma.invoice.groupBy({
      by: ["status"],
      _count: true,
      _sum: { totalAmount: true },
    }),
  ])

  const statusSummary = {
    draft: { count: 0, total: 0 },
    sent: { count: 0, total: 0 },
    paid: { count: 0, total: 0 },
    overdue: { count: 0, total: 0 },
  }

  for (const item of counts) {
    if (item.status in statusSummary) {
      statusSummary[item.status as keyof typeof statusSummary] = {
        count: item._count,
        total: item._sum.totalAmount ?? 0,
      }
    }
  }

  const cards = [
    { label: "下書き", ...statusSummary.draft, color: "text-gray-600" },
    { label: "送信済み（未入金）", ...statusSummary.sent, color: "text-blue-600" },
    { label: "入金済み", ...statusSummary.paid, color: "text-green-600" },
    { label: "期限超過", ...statusSummary.overdue, color: "text-red-600" },
  ]

  return (
    <div className="space-y-6">
      <PageHeader title="ダッシュボード" />

      {/* サマリーカード */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <Card key={card.label}>
            <p className="text-base text-gray-500">{card.label}</p>
            <p className={`mt-1 text-2xl font-bold ${card.color}`}>
              {card.count}件
            </p>
            <p className="mt-1 text-base text-gray-600">
              {formatCurrency(card.total)}
            </p>
          </Card>
        ))}
      </div>

      {/* 最近の請求書 */}
      <Card className="p-0 overflow-x-auto">
        <div className="px-cell py-4 border-b bg-gray-50">
          <h2 className="font-semibold">最近の請求書</h2>
        </div>
        <table className="w-full min-w-max text-fluid">
          <thead className="border-b">
            <tr>
              <th className="whitespace-nowrap px-cell py-3 text-left font-medium text-gray-600">番号</th>
              <th className="whitespace-nowrap px-cell py-3 text-left font-medium text-gray-600">顧客</th>
              <th className="whitespace-nowrap px-cell py-3 text-right font-medium text-gray-600">金額</th>
              <th className="whitespace-nowrap px-cell py-3 text-left font-medium text-gray-600">期限</th>
              <th className="whitespace-nowrap px-cell py-3 text-left font-medium text-gray-600">ステータス</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {invoices.map((inv) => (
              <tr key={inv.id} className="hover:bg-gray-50">
                <td className="px-cell py-3">
                  <Link href={`/invoices/${inv.id}`} className="text-blue-600 hover:text-blue-800">
                    {inv.invoiceNumber}
                  </Link>
                </td>
                <td className="px-cell py-3">{inv.customer.name}</td>
                <td className="px-cell py-3 text-right font-medium">{formatCurrency(inv.totalAmount)}</td>
                <td className="px-cell py-3 text-gray-600">{formatDateJP(inv.dueDate)}</td>
                <td className="px-cell py-3">
                  <Badge className={statusColor(inv.status)}>
                    {formatStatus(inv.status)}
                  </Badge>
                </td>
              </tr>
            ))}
            {invoices.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                  請求書がまだありません。
                  <Link href="/invoices/new" className="text-blue-600 hover:text-blue-800 ml-1">
                    最初の請求書を作成する
                  </Link>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  )
}

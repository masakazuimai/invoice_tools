import Link from "next/link"
import { prisma } from "@/lib/db"
import { PageHeader } from "@/components/layout/page-header"
import { Card } from "@/components/ui/card"
import { formatCurrency, formatDateJP } from "@/lib/format"

export const dynamic = "force-dynamic"

function formatPaymentMethod(method: string): string {
  const map: Record<string, string> = { bankTransfer: "銀行振込", cash: "現金", other: "その他" }
  return map[method] ?? method
}

export default async function ReceiptsPage() {
  const receipts = await prisma.receipt.findMany({
    include: { customer: true, invoice: true },
    orderBy: { createdAt: "desc" },
  })

  return (
    <div className="space-y-6">
      <PageHeader
        title="領収書一覧"
        description={`${receipts.length}件の領収書`}
      />
      <Card className="p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left font-medium text-gray-500">領収書番号</th>
              <th className="px-6 py-3 text-left font-medium text-gray-500">顧客</th>
              <th className="px-6 py-3 text-left font-medium text-gray-500">対応請求書</th>
              <th className="px-6 py-3 text-left font-medium text-gray-500">発行日</th>
              <th className="px-6 py-3 text-left font-medium text-gray-500">支払方法</th>
              <th className="px-6 py-3 text-right font-medium text-gray-500">金額</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {receipts.map((r) => (
              <tr key={r.id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <Link href={`/receipts/${r.id}`} className="font-medium text-blue-600 hover:text-blue-800">
                    {r.receiptNumber}
                  </Link>
                </td>
                <td className="px-6 py-4 text-gray-900">{r.customer.name}</td>
                <td className="px-6 py-4">
                  <Link href={`/invoices/${r.invoiceId}`} className="text-blue-600 hover:text-blue-800">
                    {r.invoice.invoiceNumber}
                  </Link>
                </td>
                <td className="px-6 py-4 text-gray-600">{formatDateJP(r.issueDate)}</td>
                <td className="px-6 py-4 text-gray-600">{formatPaymentMethod(r.paymentMethod)}</td>
                <td className="px-6 py-4 text-right font-medium text-gray-900">
                  {formatCurrency(r.totalAmount)}
                </td>
              </tr>
            ))}
            {receipts.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                  領収書がまだ発行されていません
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  )
}

import Link from "next/link"
import { prisma } from "@/lib/db"
import { PageHeader } from "@/components/layout/page-header"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { formatCurrency, formatDateJP, formatStatus, statusColor } from "@/lib/format"

export const dynamic = "force-dynamic"

export default async function DeliveryNotesPage() {
  const deliveryNotes = await prisma.deliveryNote.findMany({
    include: { customer: true },
    orderBy: { createdAt: "desc" },
  })

  return (
    <div className="space-y-6">
      <PageHeader
        title="納品書一覧"
        description={`${deliveryNotes.length}件の納品書`}
        actions={
          <Link href="/delivery-notes/new">
            <Button>新規作成</Button>
          </Link>
        }
      />
      <Card className="p-0 overflow-x-auto">
        <table className="w-full min-w-max text-fluid">
          <thead className="border-b bg-gray-50">
            <tr>
              <th className="whitespace-nowrap px-cell py-3 text-left font-medium text-gray-600">納品書番号</th>
              <th className="whitespace-nowrap px-cell py-3 text-left font-medium text-gray-600">顧客</th>
              <th className="whitespace-nowrap px-cell py-3 text-left font-medium text-gray-600">件名</th>
              <th className="whitespace-nowrap px-cell py-3 text-left font-medium text-gray-600">納品日</th>
              <th className="whitespace-nowrap px-cell py-3 text-right font-medium text-gray-600">金額</th>
              <th className="whitespace-nowrap px-cell py-3 text-left font-medium text-gray-600">ステータス</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {deliveryNotes.map((dn) => (
              <tr key={dn.id} className="hover:bg-gray-50">
                <td className="whitespace-nowrap px-cell py-4">
                  <Link href={`/delivery-notes/${dn.id}`} className="font-medium text-blue-600 hover:text-blue-800">
                    {dn.deliveryNoteNumber}
                  </Link>
                </td>
                <td className="px-cell py-4 text-gray-900">{dn.customer.name}</td>
                <td className="px-cell py-4 text-gray-600">{dn.subject ?? "-"}</td>
                <td className="whitespace-nowrap px-cell py-4 text-gray-600">{formatDateJP(dn.deliveryDate)}</td>
                <td className="whitespace-nowrap px-cell py-4 text-right font-medium text-gray-900 tabular-nums">
                  {formatCurrency(dn.totalAmount)}
                </td>
                <td className="px-cell py-4 flex gap-2">
                  <Badge className={statusColor(dn.status)}>
                    {formatStatus(dn.status)}
                  </Badge>
                  {dn.invoiceId ? (
                    <Badge className="bg-blue-100 text-blue-700">請求済み</Badge>
                  ) : dn.status === "delivered" ? (
                    <Badge className="bg-yellow-100 text-yellow-700">未請求</Badge>
                  ) : null}
                </td>
              </tr>
            ))}
            {deliveryNotes.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                  納品書がまだ作成されていません
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  )
}

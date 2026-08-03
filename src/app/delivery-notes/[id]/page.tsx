import { notFound } from "next/navigation"
import Link from "next/link"
import { prisma } from "@/lib/db"
import { PageHeader } from "@/components/layout/page-header"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { formatCurrency, formatDateJP, formatStatus, statusColor } from "@/lib/format"
import { DeliveryNoteActions } from "@/components/delivery-notes/delivery-note-actions"
import { EmailHistoryCard } from "@/components/email/email-history-card"

type Props = { params: Promise<{ id: string }> }

export default async function DeliveryNoteDetailPage({ params }: Props) {
  const { id } = await params
  const deliveryNote = await prisma.deliveryNote.findUnique({
    where: { id },
    include: {
      customer: true,
      items: { orderBy: { sortOrder: "asc" } },
    },
  })

  if (!deliveryNote) notFound()

  const profile = await prisma.companyProfile.findFirst()

  return (
    <div className="space-y-6">
      <PageHeader
        title={`納品書 ${deliveryNote.deliveryNoteNumber}`}
        actions={
          <div className="flex gap-3">
            {deliveryNote.status === "draft" && (
              <Link href={`/delivery-notes/${deliveryNote.id}/edit`}>
                <Button variant="secondary">編集</Button>
              </Link>
            )}
            <DeliveryNoteActions deliveryNoteId={deliveryNote.id} currentStatus={deliveryNote.status} />
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <div className="flex justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold">納品書</h2>
                <p className="text-base text-gray-500 mt-1">{deliveryNote.deliveryNoteNumber}</p>
              </div>
              <Badge className={statusColor(deliveryNote.status)}>
                {formatStatus(deliveryNote.status)}
              </Badge>
            </div>

            <div className="mb-6">
              <p className="text-lg font-semibold">{deliveryNote.customer.name} 御中</p>
              {deliveryNote.customer.contactPerson && (
                <p className="text-base text-gray-600">
                  {deliveryNote.customer.contactTitle ? `${deliveryNote.customer.contactTitle} ` : ""}
                  {deliveryNote.customer.contactPerson} 様
                </p>
              )}
              {deliveryNote.customer.address && (
                <p className="text-base text-gray-500">{deliveryNote.customer.address}</p>
              )}
            </div>

            {deliveryNote.subject && (
              <div className="mb-6">
                <p className="text-base text-gray-500">件名</p>
                <p className="font-medium">{deliveryNote.subject}</p>
              </div>
            )}

            <table className="w-full text-base mb-6">
              <thead className="border-b bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left font-medium text-gray-600">No.</th>
                  <th className="px-4 py-2 text-left font-medium text-gray-600">品目</th>
                  <th className="px-4 py-2 text-right font-medium text-gray-600">数量</th>
                  <th className="px-4 py-2 text-left font-medium text-gray-600">単位</th>
                  <th className="px-4 py-2 text-right font-medium text-gray-600">単価</th>
                  <th className="px-4 py-2 text-right font-medium text-gray-600">金額</th>
                  <th className="px-4 py-2 text-center font-medium text-gray-600">税率</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {deliveryNote.items.map((item, index) => (
                  <tr key={item.id}>
                    <td className="px-4 py-3 text-gray-500">{index + 1}</td>
                    <td className="px-4 py-3 font-medium">{item.name}</td>
                    <td className="px-4 py-3 text-right">{item.quantity}</td>
                    <td className="px-4 py-3">{item.unit}</td>
                    <td className="px-4 py-3 text-right">{formatCurrency(item.unitPrice)}</td>
                    <td className="px-4 py-3 text-right">{formatCurrency(item.amount)}</td>
                    <td className="px-4 py-3 text-center">
                      {item.taxRate}%{item.taxRate === 8 && " ※"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {deliveryNote.taxAmount8 > 0 && (
              <p className="text-base text-gray-500 mb-4">※ 軽減税率（8%）対象</p>
            )}

            <div className="flex flex-col items-end gap-1 text-base">
              <div className="flex gap-6 text-lg font-bold border-t pt-2 mt-1">
                <span className="w-40 text-right">合計金額:</span>
                <span className="w-28 text-right">{formatCurrency(deliveryNote.totalAmount)}</span>
              </div>
            </div>

            {deliveryNote.notes && (
              <div className="mt-6 border-t pt-4">
                <h3 className="text-base font-medium text-gray-500 mb-1">備考</h3>
                <p className="text-base whitespace-pre-wrap">{deliveryNote.notes}</p>
              </div>
            )}
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <h3 className="font-semibold mb-3">詳細</h3>
            <dl className="space-y-3 text-base">
              <div>
                <dt className="text-gray-500">発行日</dt>
                <dd>{formatDateJP(deliveryNote.issueDate)}</dd>
              </div>
              <div>
                <dt className="text-gray-500">納品日</dt>
                <dd>{formatDateJP(deliveryNote.deliveryDate)}</dd>
              </div>
              {deliveryNote.quotationId && (
                <div>
                  <dt className="text-gray-500">元の見積書</dt>
                  <dd>
                    <Link href={`/quotations/${deliveryNote.quotationId}`} className="text-blue-600 hover:text-blue-800">
                      見積書を表示
                    </Link>
                  </dd>
                </div>
              )}
            </dl>
          </Card>

          {profile && (
            <Card>
              <h3 className="font-semibold mb-3">発行元</h3>
              <div className="text-base space-y-1">
                <p className="font-medium">{profile.name}</p>
                <p className="text-gray-500">{profile.address}</p>
                <p className="text-gray-500">TEL: {profile.phone}</p>
              </div>
            </Card>
          )}

          <EmailHistoryCard documentType="delivery-note" documentId={deliveryNote.id} />
        </div>
      </div>
    </div>
  )
}

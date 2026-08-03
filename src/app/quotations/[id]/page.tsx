import { notFound } from "next/navigation"
import Link from "next/link"
import { prisma } from "@/lib/db"
import { PageHeader } from "@/components/layout/page-header"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { formatCurrency, formatDateJP, formatStatus, statusColor } from "@/lib/format"
import { QuotationActions } from "@/components/quotations/quotation-actions"
import { EmailHistoryCard } from "@/components/email/email-history-card"

type Props = { params: Promise<{ id: string }> }

export default async function QuotationDetailPage({ params }: Props) {
  const { id } = await params
  const quotation = await prisma.quotation.findUnique({
    where: { id },
    include: {
      customer: true,
      items: { orderBy: { sortOrder: "asc" } },
    },
  })

  if (!quotation) notFound()

  const profile = await prisma.companyProfile.findFirst()

  return (
    <div className="space-y-6">
      <PageHeader
        title={`見積書 ${quotation.quotationNumber}`}
        actions={
          <div className="flex gap-3">
            {quotation.status === "draft" && (
              <Link href={`/quotations/${quotation.id}/edit`}>
                <Button variant="secondary">編集</Button>
              </Link>
            )}
            <QuotationActions quotationId={quotation.id} currentStatus={quotation.status} />
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <div className="flex justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold">御見積書</h2>
                <p className="text-base text-gray-500 mt-1">{quotation.quotationNumber}</p>
              </div>
              <Badge className={statusColor(quotation.status)}>
                {formatStatus(quotation.status)}
              </Badge>
            </div>

            {/* 宛先 */}
            <div className="mb-6">
              <p className="text-lg font-semibold">{quotation.customer.name} 御中</p>
              {quotation.customer.contactPerson && (
                <p className="text-base text-gray-600">
                  {quotation.customer.contactTitle ? `${quotation.customer.contactTitle} ` : ""}
                  {quotation.customer.contactPerson} 様
                </p>
              )}
              {quotation.customer.address && (
                <p className="text-base text-gray-500">{quotation.customer.address}</p>
              )}
            </div>

            {/* 件名 */}
            {quotation.subject && (
              <div className="mb-6">
                <p className="text-base text-gray-500">件名</p>
                <p className="font-medium">{quotation.subject}</p>
              </div>
            )}

            {/* 明細テーブル */}
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
                {quotation.items.map((item, index) => (
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

            {quotation.taxAmount8 > 0 && (
              <p className="text-base text-gray-500 mb-4">※ 軽減税率（8%）対象</p>
            )}

            {/* 合計 */}
            <div className="flex flex-col items-end gap-1 text-base">
              {quotation.taxAmount10 > 0 && (
                <div className="flex gap-6">
                  <span className="text-gray-500 w-40 text-right">10%対象 消費税:</span>
                  <span className="w-28 text-right">{formatCurrency(quotation.taxAmount10)}</span>
                </div>
              )}
              {quotation.taxAmount8 > 0 && (
                <div className="flex gap-6">
                  <span className="text-gray-500 w-40 text-right">8%対象 消費税:</span>
                  <span className="w-28 text-right">{formatCurrency(quotation.taxAmount8)}</span>
                </div>
              )}
              <div className="flex gap-6 border-t pt-2 mt-1">
                <span className="text-gray-500 w-40 text-right">小計（税抜）:</span>
                <span className="w-28 text-right">{formatCurrency(quotation.subtotal)}</span>
              </div>
              <div className="flex gap-6">
                <span className="text-gray-500 w-40 text-right">消費税合計:</span>
                <span className="w-28 text-right">{formatCurrency(quotation.taxAmount10 + quotation.taxAmount8)}</span>
              </div>
              <div className="flex gap-6 text-lg font-bold border-t pt-2 mt-1">
                <span className="w-40 text-right">合計金額:</span>
                <span className="w-28 text-right">{formatCurrency(quotation.totalAmount)}</span>
              </div>
            </div>

            {quotation.notes && (
              <div className="mt-6 border-t pt-4">
                <h3 className="text-base font-medium text-gray-500 mb-1">備考</h3>
                <p className="text-base whitespace-pre-wrap">{quotation.notes}</p>
              </div>
            )}
          </Card>
        </div>

        {/* サイドバー */}
        <div className="space-y-6">
          <Card>
            <h3 className="font-semibold mb-3">詳細</h3>
            <dl className="space-y-3 text-base">
              <div>
                <dt className="text-gray-500">発行日</dt>
                <dd>{formatDateJP(quotation.issueDate)}</dd>
              </div>
              <div>
                <dt className="text-gray-500">有効期限</dt>
                <dd>{formatDateJP(quotation.validUntil)}</dd>
              </div>
              {quotation.sentAt && (
                <div>
                  <dt className="text-gray-500">送付日</dt>
                  <dd>{formatDateJP(quotation.sentAt)}</dd>
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
                <p className="text-gray-500">登録番号: {profile.invoiceRegNumber}</p>
              </div>
            </Card>
          )}

          <EmailHistoryCard documentType="quotation" documentId={quotation.id} />
        </div>
      </div>
    </div>
  )
}

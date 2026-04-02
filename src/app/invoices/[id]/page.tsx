import { notFound } from "next/navigation"
import Link from "next/link"
import { prisma } from "@/lib/db"
import { PageHeader } from "@/components/layout/page-header"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { formatCurrency, formatDateJP, formatStatus, statusColor } from "@/lib/format"
import { InvoiceActions } from "@/components/invoices/invoice-actions"

type Props = { params: Promise<{ id: string }> }

export default async function InvoiceDetailPage({ params }: Props) {
  const { id } = await params
  const invoice = await prisma.invoice.findUnique({
    where: { id },
    include: {
      customer: true,
      items: { orderBy: { sortOrder: "asc" } },
    },
  })

  if (!invoice) notFound()

  // 自社情報を取得
  const profile = await prisma.companyProfile.findFirst()

  // 領収書が紐付いていなければ削除・ステータス変更可能
  const receiptCount = await prisma.receipt.count({ where: { invoiceId: id } })
  const canDelete = receiptCount === 0

  return (
    <div className="space-y-6">
      <PageHeader
        title={`請求書 ${invoice.invoiceNumber}`}
        actions={
          <div className="flex gap-3">
            {invoice.status === "draft" && (
              <Link href={`/invoices/${invoice.id}/edit`}>
                <Button variant="secondary">編集</Button>
              </Link>
            )}
            <InvoiceActions invoiceId={invoice.id} currentStatus={invoice.status} canDelete={canDelete} />
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* メイン情報 */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <div className="flex justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold">請求書</h2>
                <p className="text-sm text-gray-500 mt-1">{invoice.invoiceNumber}</p>
              </div>
              <Badge className={statusColor(invoice.status)}>
                {formatStatus(invoice.status)}
              </Badge>
            </div>

            {/* 宛先 */}
            <div className="mb-6">
              <p className="text-lg font-semibold">{invoice.customer.name} 御中</p>
              {invoice.customer.contactPerson && (
                <p className="text-sm text-gray-600">{invoice.customer.contactTitle ? `${invoice.customer.contactTitle} ` : ""}{invoice.customer.contactPerson} 様</p>
              )}
              {invoice.customer.address && (
                <p className="text-sm text-gray-500">{invoice.customer.address}</p>
              )}
            </div>

            {/* 件名 */}
            {invoice.subject && (
              <div className="mb-6">
                <p className="text-sm text-gray-500">件名</p>
                <p className="font-medium">{invoice.subject}</p>
              </div>
            )}

            {/* 明細テーブル */}
            <table className="w-full text-sm mb-6">
              <thead className="border-b bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left font-medium text-gray-500">No.</th>
                  <th className="px-4 py-2 text-left font-medium text-gray-500">品目</th>
                  <th className="px-4 py-2 text-right font-medium text-gray-500">数量</th>
                  <th className="px-4 py-2 text-left font-medium text-gray-500">単位</th>
                  <th className="px-4 py-2 text-right font-medium text-gray-500">単価</th>
                  <th className="px-4 py-2 text-right font-medium text-gray-500">金額</th>
                  <th className="px-4 py-2 text-center font-medium text-gray-500">税率</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {invoice.items.map((item, index) => (
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

            {/* 8%対象がある場合の注記 */}
            {invoice.taxAmount8 > 0 && (
              <p className="text-xs text-gray-500 mb-4">※ 軽減税率（8%）対象</p>
            )}

            {/* 合計 */}
            <div className="flex flex-col items-end gap-1 text-sm">
              {invoice.taxAmount10 > 0 && (
                <div className="flex gap-6">
                  <span className="text-gray-500 w-40 text-right">10%対象 消費税:</span>
                  <span className="w-28 text-right">{formatCurrency(invoice.taxAmount10)}</span>
                </div>
              )}
              {invoice.taxAmount8 > 0 && (
                <div className="flex gap-6">
                  <span className="text-gray-500 w-40 text-right">8%対象 消費税:</span>
                  <span className="w-28 text-right">{formatCurrency(invoice.taxAmount8)}</span>
                </div>
              )}
              <div className="flex gap-6 border-t pt-2 mt-1">
                <span className="text-gray-500 w-40 text-right">小計（税抜）:</span>
                <span className="w-28 text-right">{formatCurrency(invoice.subtotal)}</span>
              </div>
              <div className="flex gap-6">
                <span className="text-gray-500 w-40 text-right">消費税合計:</span>
                <span className="w-28 text-right">{formatCurrency(invoice.taxAmount10 + invoice.taxAmount8)}</span>
              </div>
              <div className="flex gap-6 text-lg font-bold border-t pt-2 mt-1">
                <span className="w-40 text-right">合計金額:</span>
                <span className="w-28 text-right">{formatCurrency(invoice.totalAmount)}</span>
              </div>
            </div>

            {invoice.notes && (
              <div className="mt-6 border-t pt-4">
                <h3 className="text-sm font-medium text-gray-500 mb-1">備考</h3>
                <p className="text-sm whitespace-pre-wrap">{invoice.notes}</p>
              </div>
            )}
          </Card>
        </div>

        {/* サイドバー */}
        <div className="space-y-6">
          <Card>
            <h3 className="font-semibold mb-3">詳細</h3>
            <dl className="space-y-3 text-sm">
              <div>
                <dt className="text-gray-500">発行日</dt>
                <dd>{formatDateJP(invoice.issueDate)}</dd>
              </div>
              <div>
                <dt className="text-gray-500">支払期限</dt>
                <dd>{formatDateJP(invoice.dueDate)}</dd>
              </div>
              {invoice.sentAt && (
                <div>
                  <dt className="text-gray-500">送信日</dt>
                  <dd>{formatDateJP(invoice.sentAt)}</dd>
                </div>
              )}
              {invoice.paidAt && (
                <div>
                  <dt className="text-gray-500">入金日</dt>
                  <dd>{formatDateJP(invoice.paidAt)}</dd>
                </div>
              )}
              {invoice.quotationId && (
                <div>
                  <dt className="text-gray-500">元の見積書</dt>
                  <dd>
                    <Link href={`/quotations/${invoice.quotationId}`} className="text-blue-600 hover:text-blue-800">
                      見積書を表示
                    </Link>
                  </dd>
                </div>
              )}
              {invoice.deliveryNoteId && (
                <div>
                  <dt className="text-gray-500">元の納品書</dt>
                  <dd>
                    <Link href={`/delivery-notes/${invoice.deliveryNoteId}`} className="text-blue-600 hover:text-blue-800">
                      納品書を表示
                    </Link>
                  </dd>
                </div>
              )}
            </dl>
          </Card>

          {profile && (
            <Card>
              <h3 className="font-semibold mb-3">発行元</h3>
              <div className="text-sm space-y-1">
                <p className="font-medium">{profile.name}</p>
                <p className="text-gray-500">{profile.address}</p>
                <p className="text-gray-500">TEL: {profile.phone}</p>
                <p className="text-gray-500">登録番号: {profile.invoiceRegNumber}</p>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}

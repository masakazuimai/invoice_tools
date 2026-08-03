import { notFound } from "next/navigation"
import Link from "next/link"
import { prisma } from "@/lib/db"
import { PageHeader } from "@/components/layout/page-header"
import { Card } from "@/components/ui/card"
import { formatCurrency, formatDateJP } from "@/lib/format"
import { ReceiptActions } from "@/components/receipts/receipt-actions"
import { EmailHistoryCard } from "@/components/email/email-history-card"

type Props = { params: Promise<{ id: string }> }

function formatPaymentMethod(method: string): string {
  const map: Record<string, string> = { bankTransfer: "銀行振込", cash: "現金", other: "その他" }
  return map[method] ?? method
}

export default async function ReceiptDetailPage({ params }: Props) {
  const { id } = await params
  const receipt = await prisma.receipt.findUnique({
    where: { id },
    include: { customer: true, invoice: true },
  })

  if (!receipt) notFound()

  const profile = await prisma.companyProfile.findFirst()

  return (
    <div className="space-y-6">
      <PageHeader
        title={`領収書 ${receipt.receiptNumber}`}
        actions={<ReceiptActions receiptId={receipt.id} />}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <div className="mb-6">
              <h2 className="text-xl font-bold">領収書</h2>
              <p className="text-base text-gray-500 mt-1">{receipt.receiptNumber}</p>
            </div>

            <div className="mb-6">
              <p className="text-lg font-semibold">{receipt.customer.name} 様</p>
              {receipt.customer.address && (
                <p className="text-base text-gray-500">{receipt.customer.address}</p>
              )}
            </div>

            <div className="border-t border-b py-6 my-6">
              <p className="text-center text-base text-gray-500 mb-2">領収金額</p>
              <p className="text-center text-3xl font-bold">{formatCurrency(receipt.totalAmount)}</p>
            </div>

            <dl className="space-y-3 text-base">
              <div className="flex gap-4">
                <dt className="text-gray-500 w-24">但し書き</dt>
                <dd>{receipt.subject ?? "-"}</dd>
              </div>
              <div className="flex gap-4">
                <dt className="text-gray-500 w-24">支払方法</dt>
                <dd>{formatPaymentMethod(receipt.paymentMethod)}</dd>
              </div>
              {receipt.taxAmount10 > 0 && (
                <div className="flex gap-4">
                  <dt className="text-gray-500 w-24">10%消費税</dt>
                  <dd>{formatCurrency(receipt.taxAmount10)}</dd>
                </div>
              )}
              {receipt.taxAmount8 > 0 && (
                <div className="flex gap-4">
                  <dt className="text-gray-500 w-24">8%消費税</dt>
                  <dd>{formatCurrency(receipt.taxAmount8)}</dd>
                </div>
              )}
            </dl>

            {receipt.notes && (
              <div className="mt-6 border-t pt-4">
                <h3 className="text-base font-medium text-gray-500 mb-1">備考</h3>
                <p className="text-base whitespace-pre-wrap">{receipt.notes}</p>
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
                <dd>{formatDateJP(receipt.issueDate)}</dd>
              </div>
              <div>
                <dt className="text-gray-500">対応請求書</dt>
                <dd>
                  <Link href={`/invoices/${receipt.invoiceId}`} className="text-blue-600 hover:text-blue-800">
                    {receipt.invoice.invoiceNumber}
                  </Link>
                </dd>
              </div>
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

          <EmailHistoryCard documentType="receipt" documentId={receipt.id} />
        </div>
      </div>
    </div>
  )
}

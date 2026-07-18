import { prisma } from "@/lib/db"
import { Card } from "@/components/ui/card"
import { formatDateTimeJP } from "@/lib/format"

type Props = {
  documentType: "invoice" | "quotation" | "delivery-note" | "receipt"
  documentId: string
}

// 指定書類のメール送信履歴を表示する。履歴が無ければ何も描画しない
export async function EmailHistoryCard({ documentType, documentId }: Props) {
  const logs = await prisma.emailLog.findMany({
    where: { documentType, documentId },
    orderBy: { createdAt: "desc" },
  })

  if (logs.length === 0) return null

  return (
    <Card>
      <h3 className="font-semibold mb-3">送信履歴</h3>
      <ul className="space-y-3 text-sm">
        {logs.map((log) => (
          <li key={log.id} className="border-b border-gray-100 pb-3 last:border-0 last:pb-0">
            <div className="flex items-center justify-between gap-2">
              <span className="text-gray-700">{formatDateTimeJP(log.createdAt)}</span>
              <span
                className={
                  log.status === "sent"
                    ? "rounded px-2 py-0.5 text-xs bg-green-100 text-green-700"
                    : "rounded px-2 py-0.5 text-xs bg-red-100 text-red-700"
                }
              >
                {log.status === "sent" ? "送信成功" : "送信失敗"}
              </span>
            </div>
            <p className="text-gray-500 mt-1 break-all">{log.to}</p>
            {log.status === "failed" && log.errorMessage && (
              <p className="text-red-600 mt-1 break-all">{log.errorMessage}</p>
            )}
          </li>
        ))}
      </ul>
    </Card>
  )
}

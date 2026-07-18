/** 金額を日本円フォーマットで表示 */
export function formatCurrency(amount: number): string {
  return `¥${amount.toLocaleString("ja-JP")}`
}

/** 日付を日本語フォーマットで表示 (YYYY年MM月DD日) */
export function formatDateJP(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`
}

/** 日付を「YYYY年M月分」形式で表示（メール件名などの対象月表記に使用） */
export function formatYearMonthJP(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date
  return `${d.getFullYear()}年${d.getMonth() + 1}月分`
}

/** 日時を日本語フォーマットで表示 (YYYY年MM月DD日 HH:MM) */
export function formatDateTimeJP(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date
  const hh = String(d.getHours()).padStart(2, "0")
  const mm = String(d.getMinutes()).padStart(2, "0")
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日 ${hh}:${mm}`
}

/** 日付をISO形式 (YYYY-MM-DD) に変換 */
export function formatDateISO(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date
  return d.toISOString().split("T")[0]
}

/** ステータスの日本語表示 */
export function formatStatus(status: string): string {
  const statusMap: Record<string, string> = {
    draft: "下書き",
    sent: "送信済み",
    paid: "入金済み",
    overdue: "期限超過",
    delivered: "納品済み",
    accepted: "承認済み",
    rejected: "却下",
    expired: "期限切れ",
  }
  return statusMap[status] ?? status
}

/** ステータスに対応するカラークラス */
export function statusColor(status: string): string {
  const colorMap: Record<string, string> = {
    draft: "bg-gray-100 text-gray-700",
    sent: "bg-blue-100 text-blue-700",
    paid: "bg-green-100 text-green-700",
    overdue: "bg-red-100 text-red-700",
    delivered: "bg-green-100 text-green-700",
    accepted: "bg-green-100 text-green-700",
    rejected: "bg-red-100 text-red-700",
    expired: "bg-yellow-100 text-yellow-700",
  }
  return colorMap[status] ?? "bg-gray-100 text-gray-700"
}

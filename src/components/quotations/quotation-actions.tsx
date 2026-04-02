"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"

type Props = {
  quotationId: string
  currentStatus: string
}

export function QuotationActions({ quotationId, currentStatus }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState("")

  const updateStatus = async (status: string) => {
    setLoading(status)
    await fetch(`/api/quotations/${quotationId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    })
    setLoading("")
    router.refresh()
  }

  const deleteQuotation = async () => {
    if (!confirm("この見積書を削除しますか？この操作は元に戻せません。")) return
    setLoading("delete")
    const res = await fetch(`/api/quotations/${quotationId}`, { method: "DELETE" })
    if (res.ok) {
      router.push("/quotations")
    } else {
      alert("削除に失敗しました")
    }
    setLoading("")
  }

  return (
    <div className="flex gap-2">
      <Button
        variant="secondary"
        onClick={() => window.open(`/api/quotations/${quotationId}/pdf?inline=1`, "_blank")}
      >
        PDF
      </Button>

      {currentStatus === "draft" && (
        <Button variant="secondary" onClick={() => updateStatus("sent")} disabled={loading === "sent"}>
          送付済みにする
        </Button>
      )}

      {(currentStatus === "sent" || currentStatus === "accepted") && (
        <>
          <Button
            onClick={async () => {
              setLoading("convert-invoice")
              const res = await fetch(`/api/quotations/${quotationId}/convert-to-invoice`, { method: "POST" })
              if (res.ok) {
                const invoice = await res.json()
                router.push(`/invoices/${invoice.id}`)
              } else {
                const data = await res.json()
                alert(data.error ?? "変換に失敗しました")
              }
              setLoading("")
            }}
            disabled={loading === "convert-invoice"}
          >
            {loading === "convert-invoice" ? "作成中..." : "請求書を作成"}
          </Button>
          <Button
            variant="secondary"
            onClick={async () => {
              setLoading("convert-dn")
              const res = await fetch(`/api/quotations/${quotationId}/convert-to-delivery-note`, { method: "POST" })
              if (res.ok) {
                const dn = await res.json()
                router.push(`/delivery-notes/${dn.id}`)
              } else {
                const data = await res.json()
                alert(data.error ?? "変換に失敗しました")
              }
              setLoading("")
            }}
            disabled={loading === "convert-dn"}
          >
            {loading === "convert-dn" ? "作成中..." : "納品書を作成"}
          </Button>
        </>
      )}

      {currentStatus === "sent" && (
        <>
          <Button variant="secondary" onClick={() => updateStatus("accepted")} disabled={loading === "accepted"}>
            承認済みにする
          </Button>
          <Button variant="secondary" onClick={() => updateStatus("rejected")} disabled={loading === "rejected"}>
            却下
          </Button>
        </>
      )}

      {currentStatus !== "draft" && (
        <Button variant="secondary" onClick={() => updateStatus("draft")} disabled={loading === "draft"}>
          下書きに戻す
        </Button>
      )}

      <Button variant="danger" onClick={deleteQuotation} disabled={loading === "delete"}>
        {loading === "delete" ? "削除中..." : "削除"}
      </Button>
    </div>
  )
}

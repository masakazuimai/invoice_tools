"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { SendEmailButton } from "@/components/email/send-email-button"

type Props = {
  invoiceId: string
  currentStatus: string
  canDelete?: boolean
}

export function InvoiceActions({ invoiceId, currentStatus, canDelete = true }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState("")

  const updateStatus = async (status: string) => {
    setLoading(status)
    await fetch(`/api/invoices/${invoiceId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    })
    setLoading("")
    router.refresh()
  }

  const duplicate = async () => {
    setLoading("duplicate")
    const res = await fetch(`/api/invoices/${invoiceId}/duplicate`, { method: "POST" })
    if (res.ok) {
      const newInvoice = await res.json()
      router.push(`/invoices/${newInvoice.id}`)
    } else {
      const data = await res.json()
      alert(data.error ?? "複製に失敗しました")
    }
    setLoading("")
  }

  const deleteInvoice = async () => {
    if (!confirm("この請求書を削除しますか？この操作は元に戻せません。")) return
    setLoading("delete")
    const res = await fetch(`/api/invoices/${invoiceId}`, { method: "DELETE" })
    if (res.ok) {
      router.push("/invoices")
    } else {
      alert("削除に失敗しました")
    }
    setLoading("")
  }

  return (
    <div className="flex gap-2">
      <Button
        variant="secondary"
        onClick={() => window.open(`/api/invoices/${invoiceId}/pdf?inline=1`, "_blank")}
      >
        PDF
      </Button>

      <Button variant="secondary" onClick={duplicate} disabled={loading === "duplicate"}>
        {loading === "duplicate" ? "複製中..." : "複製"}
      </Button>

      <Button
        variant="secondary"
        onClick={async () => {
          setLoading("to-dn")
          const res = await fetch(`/api/invoices/${invoiceId}/convert-to-delivery-note`, { method: "POST" })
          if (res.ok) {
            const dn = await res.json()
            router.push(`/delivery-notes/${dn.id}`)
          } else {
            const data = await res.json()
            alert(data.error ?? "変換に失敗しました")
          }
          setLoading("")
        }}
        disabled={loading === "to-dn"}
      >
        {loading === "to-dn" ? "作成中..." : "納品書を作成"}
      </Button>

      {currentStatus === "draft" && (
        <>
          <SendEmailButton endpoint={`/api/invoices/${invoiceId}/send`} />
          <Button variant="secondary" onClick={() => updateStatus("sent")} disabled={loading === "sent"}>
            送信済みにする
          </Button>
        </>
      )}

      {currentStatus !== "draft" && canDelete && (
        <Button variant="secondary" onClick={() => updateStatus("draft")} disabled={loading === "draft"}>
          下書きに戻す
        </Button>
      )}

      {(currentStatus === "sent" || currentStatus === "overdue") && (
        <Button onClick={() => updateStatus("paid")} disabled={loading === "paid"}>
          {loading === "paid" ? "処理中..." : "入金済みにする"}
        </Button>
      )}

      {currentStatus === "paid" && (
        <Button
          variant="secondary"
          onClick={async () => {
            setLoading("receipt")
            const res = await fetch(`/api/invoices/${invoiceId}/create-receipt`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({}),
            })
            if (res.ok) {
              const receipt = await res.json()
              router.push(`/receipts/${receipt.id}`)
            } else {
              const data = await res.json()
              alert(data.error ?? "領収書の発行に失敗しました")
            }
            setLoading("")
          }}
          disabled={loading === "receipt"}
        >
          {loading === "receipt" ? "発行中..." : "領収書を発行"}
        </Button>
      )}

      {canDelete && (
        <Button variant="danger" onClick={deleteInvoice} disabled={loading === "delete"}>
          {loading === "delete" ? "削除中..." : "削除"}
        </Button>
      )}
    </div>
  )
}

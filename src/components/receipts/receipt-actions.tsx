"use client"

import { Button } from "@/components/ui/button"
import { SendEmailButton } from "@/components/email/send-email-button"

type Props = {
  receiptId: string
}

export function ReceiptActions({ receiptId }: Props) {
  return (
    <div className="flex gap-2">
      <Button
        variant="secondary"
        onClick={() => window.open(`/api/receipts/${receiptId}/pdf?inline=1`, "_blank")}
      >
        PDF
      </Button>

      <SendEmailButton endpoint={`/api/receipts/${receiptId}/send`} />
    </div>
  )
}

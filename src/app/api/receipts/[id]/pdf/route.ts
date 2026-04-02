import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { generateReceiptPdf } from "@/lib/pdf/generate-receipt-pdf"

type Params = { params: Promise<{ id: string }> }

export async function GET(request: Request, { params }: Params) {
  const { id } = await params
  const { searchParams } = new URL(request.url)
  const inline = searchParams.get("inline") === "1"

  try {
    const receipt = await prisma.receipt.findUnique({
      where: { id },
      include: { customer: true, invoice: true },
    })

    if (!receipt) {
      return NextResponse.json({ error: "領収書が見つかりません" }, { status: 404 })
    }

    const company = await prisma.companyProfile.findFirst()
    if (!company) {
      return NextResponse.json(
        { error: "自社情報が設定されていません。設定ページから登録してください。" },
        { status: 400 }
      )
    }

    const pdfBuffer = await generateReceiptPdf(receipt, company)

    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `${inline ? "inline" : "attachment"}; filename="${receipt.receiptNumber}.pdf"`,
      },
    })
  } catch (error) {
    console.error("領収書PDF生成エラー:", error)
    const message = error instanceof Error ? error.message : "PDF生成に失敗しました"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

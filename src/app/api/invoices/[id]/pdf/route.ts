import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { generateInvoicePdf } from "@/lib/pdf/generate-invoice-pdf"

type Params = { params: Promise<{ id: string }> }

export async function GET(_request: Request, { params }: Params) {
  const { id } = await params

  try {
    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: {
        customer: true,
        items: { orderBy: { sortOrder: "asc" } },
      },
    })

    if (!invoice) {
      return NextResponse.json({ error: "請求書が見つかりません" }, { status: 404 })
    }

    const company = await prisma.companyProfile.findFirst()
    if (!company) {
      return NextResponse.json(
        { error: "自社情報が設定されていません。設定ページから登録してください。" },
        { status: 400 }
      )
    }

    const pdfBuffer = await generateInvoicePdf(invoice, company)

    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${invoice.invoiceNumber}.pdf"`,
      },
    })
  } catch (error) {
    console.error("PDF生成エラー:", error)
    const message = error instanceof Error ? error.message : "PDF生成に失敗しました"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

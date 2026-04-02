import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { generateQuotationPdf } from "@/lib/pdf/generate-quotation-pdf"

type Params = { params: Promise<{ id: string }> }

export async function GET(request: Request, { params }: Params) {
  const { id } = await params
  const { searchParams } = new URL(request.url)
  const inline = searchParams.get("inline") === "1"

  try {
    const quotation = await prisma.quotation.findUnique({
      where: { id },
      include: {
        customer: true,
        items: { orderBy: { sortOrder: "asc" } },
      },
    })

    if (!quotation) {
      return NextResponse.json({ error: "見積書が見つかりません" }, { status: 404 })
    }

    const company = await prisma.companyProfile.findFirst()
    if (!company) {
      return NextResponse.json(
        { error: "自社情報が設定されていません。設定ページから登録してください。" },
        { status: 400 }
      )
    }

    const pdfBuffer = await generateQuotationPdf(quotation, company)

    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `${inline ? "inline" : "attachment"}; filename="${quotation.quotationNumber}.pdf"`,
      },
    })
  } catch (error) {
    console.error("見積書PDF生成エラー:", error)
    const message = error instanceof Error ? error.message : "PDF生成に失敗しました"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

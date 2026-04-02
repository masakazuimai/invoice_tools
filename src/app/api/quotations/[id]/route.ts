import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { createQuotationSchema, updateQuotationStatusSchema } from "@/schemas/quotation.schema"
import { calculateTaxSummary, calculateLineAmount } from "@/lib/tax-calculator"
import type { TaxRate } from "@/lib/tax-calculator"

type Params = { params: Promise<{ id: string }> }

export async function GET(_request: Request, { params }: Params) {
  const { id } = await params
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

  return NextResponse.json(quotation)
}

export async function PUT(request: Request, { params }: Params) {
  const { id } = await params
  const body = await request.json()

  // ステータス更新のみの場合
  const statusParsed = updateQuotationStatusSchema.safeParse(body)
  if (statusParsed.success) {
    const data: Record<string, unknown> = { status: statusParsed.data.status }
    if (statusParsed.data.status === "sent") {
      data.sentAt = new Date()
    }
    if (statusParsed.data.status === "draft") {
      data.sentAt = null
    }

    const quotation = await prisma.quotation.update({
      where: { id },
      data,
      include: { customer: true, items: true },
    })
    return NextResponse.json(quotation)
  }

  // 見積書全体の更新
  const parsed = createQuotationSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ errors: parsed.error.flatten() }, { status: 400 })
  }

  const { customerId, issueDate, validUntil, subject, items, notes } = parsed.data

  const itemsWithAmount = items.map((item, index) => ({
    ...item,
    amount: calculateLineAmount(item.quantity, item.unitPrice),
    sortOrder: index,
  }))

  const taxSummary = calculateTaxSummary(
    itemsWithAmount.map((item) => ({
      amount: item.amount,
      taxRate: item.taxRate as TaxRate,
    }))
  )

  await prisma.quotationItem.deleteMany({ where: { quotationId: id } })

  try {
    const quotation = await prisma.quotation.update({
      where: { id },
      data: {
        customerId,
        issueDate: new Date(issueDate),
        validUntil: new Date(validUntil),
        subject,
        subtotal: taxSummary.subtotal,
        taxAmount10: taxSummary.tax10,
        taxAmount8: taxSummary.tax8,
        totalAmount: taxSummary.totalAmount,
        notes,
        items: {
          create: itemsWithAmount.map((item) => ({
            itemId: item.itemId || null,
            name: item.name,
            quantity: item.quantity,
            unit: item.unit,
            unitPrice: item.unitPrice,
            taxRate: item.taxRate,
            amount: item.amount,
            sortOrder: item.sortOrder,
          })),
        },
      },
      include: { customer: true, items: true },
    })

    return NextResponse.json(quotation)
  } catch (error) {
    console.error("見積書更新エラー:", error)
    const message = error instanceof Error ? error.message : "更新に失敗しました"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  const { id } = await params
  // 見積書を参照している請求書のquotationIdをクリア
  await prisma.invoice.updateMany({
    where: { quotationId: id },
    data: { quotationId: null },
  })
  // 見積書を参照している納品書のquotationIdをクリア
  await prisma.deliveryNote.updateMany({
    where: { quotationId: id },
    data: { quotationId: null },
  })
  await prisma.quotation.delete({ where: { id } })
  return NextResponse.json({ success: true })
}

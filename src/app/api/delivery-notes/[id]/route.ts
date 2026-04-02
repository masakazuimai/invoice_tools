import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { createDeliveryNoteSchema, updateDeliveryNoteStatusSchema } from "@/schemas/delivery-note.schema"
import { calculateTaxSummary, calculateLineAmount } from "@/lib/tax-calculator"
import type { TaxRate } from "@/lib/tax-calculator"

type Params = { params: Promise<{ id: string }> }

export async function GET(_request: Request, { params }: Params) {
  const { id } = await params
  const deliveryNote = await prisma.deliveryNote.findUnique({
    where: { id },
    include: {
      customer: true,
      items: { orderBy: { sortOrder: "asc" } },
    },
  })

  if (!deliveryNote) {
    return NextResponse.json({ error: "納品書が見つかりません" }, { status: 404 })
  }

  return NextResponse.json(deliveryNote)
}

export async function PUT(request: Request, { params }: Params) {
  const { id } = await params
  const body = await request.json()

  const statusParsed = updateDeliveryNoteStatusSchema.safeParse(body)
  if (statusParsed.success) {
    const deliveryNote = await prisma.deliveryNote.update({
      where: { id },
      data: { status: statusParsed.data.status },
      include: { customer: true, items: true },
    })
    return NextResponse.json(deliveryNote)
  }

  const parsed = createDeliveryNoteSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ errors: parsed.error.flatten() }, { status: 400 })
  }

  const { customerId, issueDate, deliveryDate, subject, items, notes } = parsed.data

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

  await prisma.deliveryNoteItem.deleteMany({ where: { deliveryNoteId: id } })

  try {
    const deliveryNote = await prisma.deliveryNote.update({
      where: { id },
      data: {
        customerId,
        issueDate: new Date(issueDate),
        deliveryDate: new Date(deliveryDate),
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

    return NextResponse.json(deliveryNote)
  } catch (error) {
    console.error("納品書更新エラー:", error)
    const message = error instanceof Error ? error.message : "更新に失敗しました"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  const { id } = await params
  // 納品書を参照している請求書のdeliveryNoteIdをクリア
  await prisma.invoice.updateMany({
    where: { deliveryNoteId: id },
    data: { deliveryNoteId: null },
  })
  await prisma.deliveryNote.delete({ where: { id } })
  return NextResponse.json({ success: true })
}

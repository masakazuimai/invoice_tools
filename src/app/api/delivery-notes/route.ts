import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { createDeliveryNoteSchema } from "@/schemas/delivery-note.schema"
import { generateNextDocumentNumber } from "@/lib/document-number"
import { calculateTaxSummary, calculateLineAmount } from "@/lib/tax-calculator"
import type { TaxRate } from "@/lib/tax-calculator"

export async function GET() {
  const deliveryNotes = await prisma.deliveryNote.findMany({
    include: { customer: true },
    orderBy: { createdAt: "desc" },
  })
  return NextResponse.json(deliveryNotes)
}

export async function POST(request: Request) {
  const body = await request.json()
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

  const deliveryNoteNumber = await generateNextDocumentNumber("deliveryNote")

  try {
    const deliveryNote = await prisma.deliveryNote.create({
      data: {
        deliveryNoteNumber,
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

    return NextResponse.json(deliveryNote, { status: 201 })
  } catch (error) {
    console.error("納品書作成エラー:", error)
    const message = error instanceof Error ? error.message : "作成に失敗しました"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

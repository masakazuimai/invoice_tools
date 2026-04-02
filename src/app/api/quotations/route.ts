import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { createQuotationSchema } from "@/schemas/quotation.schema"
import { generateNextDocumentNumber } from "@/lib/document-number"
import { calculateTaxSummary, calculateLineAmount } from "@/lib/tax-calculator"
import type { TaxRate } from "@/lib/tax-calculator"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const status = searchParams.get("status")

  const quotations = await prisma.quotation.findMany({
    where: status ? { status } : undefined,
    include: { customer: true },
    orderBy: { createdAt: "desc" },
  })

  return NextResponse.json(quotations)
}

export async function POST(request: Request) {
  const body = await request.json()
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

  const quotationNumber = await generateNextDocumentNumber("quotation")

  try {
    const quotation = await prisma.quotation.create({
      data: {
        quotationNumber,
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

    return NextResponse.json(quotation, { status: 201 })
  } catch (error) {
    console.error("見積書作成エラー:", error)
    const message = error instanceof Error ? error.message : "作成に失敗しました"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

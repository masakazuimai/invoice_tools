import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { createInvoiceSchema } from "@/schemas/invoice.schema"
import { generateNextInvoiceNumber } from "@/lib/invoice-number"
import { calculateTaxSummary, calculateLineAmount } from "@/lib/tax-calculator"
import type { TaxRate } from "@/lib/tax-calculator"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const status = searchParams.get("status")

  const invoices = await prisma.invoice.findMany({
    where: status ? { status } : undefined,
    include: { customer: true },
    orderBy: { createdAt: "desc" },
  })

  return NextResponse.json(invoices)
}

export async function POST(request: Request) {
  const body = await request.json()
  const parsed = createInvoiceSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ errors: parsed.error.flatten() }, { status: 400 })
  }

  const { customerId, issueDate, dueDate, items, notes } = parsed.data

  // 明細行の金額を計算
  const itemsWithAmount = items.map((item, index) => ({
    ...item,
    amount: calculateLineAmount(item.quantity, item.unitPrice),
    sortOrder: index,
  }))

  // 税額サマリーを計算
  const taxSummary = calculateTaxSummary(
    itemsWithAmount.map((item) => ({
      amount: item.amount,
      taxRate: item.taxRate as TaxRate,
    }))
  )

  const invoiceNumber = await generateNextInvoiceNumber()

  const invoice = await prisma.invoice.create({
    data: {
      invoiceNumber,
      customerId,
      issueDate: new Date(issueDate),
      dueDate: new Date(dueDate),
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

  return NextResponse.json(invoice, { status: 201 })
}

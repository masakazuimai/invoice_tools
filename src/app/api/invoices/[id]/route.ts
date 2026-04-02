import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { createInvoiceSchema, updateInvoiceStatusSchema } from "@/schemas/invoice.schema"
import { calculateTaxSummary, calculateLineAmount } from "@/lib/tax-calculator"
import type { TaxRate } from "@/lib/tax-calculator"

type Params = { params: Promise<{ id: string }> }

export async function GET(_request: Request, { params }: Params) {
  const { id } = await params
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

  return NextResponse.json(invoice)
}

export async function PUT(request: Request, { params }: Params) {
  const { id } = await params
  const body = await request.json()

  // ステータス更新のみの場合
  const statusParsed = updateInvoiceStatusSchema.safeParse(body)
  if (statusParsed.success) {
    const data: Record<string, unknown> = { status: statusParsed.data.status }
    if (statusParsed.data.status === "sent") {
      data.sentAt = new Date()
    }
    if (statusParsed.data.status === "paid") {
      data.paidAt = new Date()
    }
    if (statusParsed.data.status === "draft") {
      data.sentAt = null
      data.paidAt = null
    }

    const invoice = await prisma.invoice.update({
      where: { id },
      data,
      include: { customer: true, items: true },
    })
    return NextResponse.json(invoice)
  }

  // 請求書全体の更新
  const parsed = createInvoiceSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ errors: parsed.error.flatten() }, { status: 400 })
  }

  const { customerId, issueDate, dueDate, subject, items, notes } = parsed.data

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

  // 既存明細を削除して再作成
  await prisma.invoiceItem.deleteMany({ where: { invoiceId: id } })

  const invoice = await prisma.invoice.update({
    where: { id },
    data: {
      customerId,
      issueDate: new Date(issueDate),
      dueDate: new Date(dueDate),
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

  return NextResponse.json(invoice)
}

export async function DELETE(_request: Request, { params }: Params) {
  const { id } = await params

  // 領収書が紐付いている場合は削除不可
  const receiptCount = await prisma.receipt.count({ where: { invoiceId: id } })
  if (receiptCount > 0) {
    return NextResponse.json({ error: "領収書が発行済みのため削除できません" }, { status: 400 })
  }

  // 納品書が紐付いている場合は参照をクリア
  await prisma.deliveryNote.updateMany({
    where: { invoiceId: id },
    data: { invoiceId: null },
  })

  await prisma.invoice.delete({ where: { id } })
  return NextResponse.json({ success: true })
}

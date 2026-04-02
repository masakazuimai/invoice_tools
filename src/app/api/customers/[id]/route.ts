import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { customerSchema } from "@/schemas/customer.schema"

type Params = { params: Promise<{ id: string }> }

export async function GET(_request: Request, { params }: Params) {
  const { id } = await params
  const customer = await prisma.customer.findUnique({ where: { id } })
  if (!customer) {
    return NextResponse.json({ error: "顧客が見つかりません" }, { status: 404 })
  }
  return NextResponse.json(customer)
}

export async function PUT(request: Request, { params }: Params) {
  const { id } = await params
  const body = await request.json()
  const parsed = customerSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ errors: parsed.error.flatten() }, { status: 400 })
  }

  try {
    const customer = await prisma.customer.update({
      where: { id },
      data: parsed.data,
    })
    return NextResponse.json(customer)
  } catch (error) {
    console.error("顧客更新エラー:", error)
    const message = error instanceof Error ? error.message : "更新に失敗しました"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  const { id } = await params
  await prisma.customer.delete({ where: { id } })
  return NextResponse.json({ success: true })
}

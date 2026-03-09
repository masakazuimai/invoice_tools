import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { itemSchema } from "@/schemas/item.schema"

type Params = { params: Promise<{ id: string }> }

export async function GET(_request: Request, { params }: Params) {
  const { id } = await params
  const item = await prisma.item.findUnique({ where: { id } })
  if (!item) {
    return NextResponse.json({ error: "品目が見つかりません" }, { status: 404 })
  }
  return NextResponse.json(item)
}

export async function PUT(request: Request, { params }: Params) {
  const { id } = await params
  const body = await request.json()
  const parsed = itemSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ errors: parsed.error.flatten() }, { status: 400 })
  }

  const item = await prisma.item.update({
    where: { id },
    data: parsed.data,
  })
  return NextResponse.json(item)
}

export async function DELETE(_request: Request, { params }: Params) {
  const { id } = await params
  await prisma.item.delete({ where: { id } })
  return NextResponse.json({ success: true })
}

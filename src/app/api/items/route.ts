import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { itemSchema } from "@/schemas/item.schema"

export async function GET() {
  const items = await prisma.item.findMany({
    orderBy: { updatedAt: "desc" },
  })
  return NextResponse.json(items)
}

export async function POST(request: Request) {
  const body = await request.json()
  const parsed = itemSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ errors: parsed.error.flatten() }, { status: 400 })
  }

  const item = await prisma.item.create({ data: parsed.data })
  return NextResponse.json(item, { status: 201 })
}

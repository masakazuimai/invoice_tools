import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { customerSchema } from "@/schemas/customer.schema"

export async function GET() {
  const customers = await prisma.customer.findMany({
    orderBy: { updatedAt: "desc" },
  })
  return NextResponse.json(customers)
}

export async function POST(request: Request) {
  const body = await request.json()
  const parsed = customerSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ errors: parsed.error.flatten() }, { status: 400 })
  }

  const customer = await prisma.customer.create({ data: parsed.data })
  return NextResponse.json(customer, { status: 201 })
}

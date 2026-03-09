import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { companyProfileSchema } from "@/schemas/settings.schema"

export async function GET() {
  const profile = await prisma.companyProfile.findFirst()
  if (!profile) {
    return NextResponse.json(null)
  }
  return NextResponse.json({
    ...profile,
    bankInfo: JSON.parse(profile.bankInfo),
  })
}

export async function PUT(request: Request) {
  const body = await request.json()
  const parsed = companyProfileSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ errors: parsed.error.flatten() }, { status: 400 })
  }

  const data = {
    ...parsed.data,
    bankInfo: JSON.stringify(parsed.data.bankInfo),
    logoUrl: parsed.data.logoUrl || null,
    sealUrl: parsed.data.sealUrl || null,
  }

  try {
    const existing = await prisma.companyProfile.findFirst()

    const profile = existing
      ? await prisma.companyProfile.update({ where: { id: existing.id }, data })
      : await prisma.companyProfile.create({ data })

    return NextResponse.json({
      ...profile,
      bankInfo: JSON.parse(profile.bankInfo),
    })
  } catch (error) {
    console.error("設定保存エラー:", error)
    const message = error instanceof Error ? error.message : "保存に失敗しました"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

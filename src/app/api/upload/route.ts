import { NextResponse } from "next/server"
import { writeFile, mkdir } from "fs/promises"
import path from "path"
import crypto from "crypto"

const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp"]
const MAX_SIZE = 2 * 1024 * 1024 // 2MB

export async function POST(request: Request) {
  const formData = await request.formData()
  const file = formData.get("file") as File | null

  if (!file) {
    return NextResponse.json({ error: "ファイルが選択されていません" }, { status: 400 })
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: "PNG, JPEG, WebP のみアップロード可能です" }, { status: 400 })
  }

  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: "ファイルサイズは2MB以下にしてください" }, { status: 400 })
  }

  const ext = file.name.split(".").pop() ?? "png"
  const fileName = `${crypto.randomUUID()}.${ext}`
  const uploadsDir = path.join(process.cwd(), "uploads")

  await mkdir(uploadsDir, { recursive: true })

  const buffer = Buffer.from(await file.arrayBuffer())
  const filePath = path.join(uploadsDir, fileName)
  await writeFile(filePath, buffer)

  return NextResponse.json({ url: `/api/upload/${fileName}` })
}

import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'
import crypto from 'crypto'
import { fixFilename } from '@/lib/utils'

const UPLOAD_DIR = path.join(process.cwd(), 'uploads', 'support')
const MAX_FILE_SIZE = 1 * 1024 * 1024 // 1MB

export async function POST(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await req.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json({ error: 'Файл не найден' }, { status: 400 })
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'Максимальный размер файла 1 МБ' }, { status: 400 })
    }

    // Fix potential encoding issue with non-ASCII filenames
    const fixedName = fixFilename(file.name)

    // Generate unique stored name
    const ext = path.extname(fixedName) || ''
    const storedName = `${crypto.randomUUID()}${ext}`

    // Ensure upload directory exists
    await mkdir(UPLOAD_DIR, { recursive: true })

    // Write file
    const buffer = Buffer.from(await file.arrayBuffer())
    await writeFile(path.join(UPLOAD_DIR, storedName), buffer)

    return NextResponse.json({
      filename: fixedName,
      storedName,
      size: file.size,
      mimeType: file.type || 'application/octet-stream',
    })
  } catch (error) {
    console.error('Support file upload error:', error)
    return NextResponse.json({ error: 'Ошибка загрузки файла' }, { status: 500 })
  }
}

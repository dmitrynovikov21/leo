import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { readFile, stat } from 'fs/promises'
import path from 'path'

const UPLOAD_DIR = path.join(process.cwd(), 'uploads', 'support')

export async function GET(
  req: Request,
  { params }: { params: Promise<{ filename: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { filename } = await params

    // Sanitize filename to prevent path traversal
    const safeName = path.basename(filename)
    const filePath = path.join(UPLOAD_DIR, safeName)

    try {
      await stat(filePath)
    } catch {
      return NextResponse.json({ error: 'Файл не найден' }, { status: 404 })
    }

    const buffer = await readFile(filePath)

    // Guess content type from extension
    const ext = path.extname(safeName).toLowerCase()
    const contentTypes: Record<string, string> = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.pdf': 'application/pdf',
      '.txt': 'text/plain',
    }

    return new Response(buffer, {
      headers: {
        'Content-Type': contentTypes[ext] || 'application/octet-stream',
        'Content-Disposition': `inline; filename="${encodeURIComponent(safeName)}"; filename*=UTF-8''${encodeURIComponent(safeName)}`,
        'Cache-Control': 'private, max-age=3600',
      },
    })
  } catch (error) {
    console.error('Support file serve error:', error)
    return NextResponse.json({ error: 'Ошибка чтения файла' }, { status: 500 })
  }
}

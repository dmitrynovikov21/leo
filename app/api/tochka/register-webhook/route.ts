import { auth } from '@/auth'
import { TochkaService } from '@/lib/tochka'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    // Admin-only
    if ((session.user as any).role !== 'ADMIN') {
      return new NextResponse('Forbidden', { status: 403 })
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || ''
    const webhookUrl = `${appUrl}/api/tochka/webhook`

    const tochka = new TochkaService()
    const result = await tochka.registerWebhook(webhookUrl, 'acquiringInternetPayment')

    return NextResponse.json({
      success: true,
      webhookUrl,
      result,
    })
  } catch (error: any) {
    console.error('[Tochka] Register webhook error:', error)
    return new NextResponse(error.message || 'Internal Server Error', { status: 500 })
  }
}

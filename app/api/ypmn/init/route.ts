import { auth } from '@/auth'
import { prisma } from '@/lib/db'
import { YpmnService } from '@/lib/ypmn'
import { NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'

export async function POST(req: Request) {
    try {
        const session = await auth()
        if (!session?.user?.id) {
            return new NextResponse('Unauthorized', { status: 401 })
        }

        const body = await req.json()
        const { amount, type = 'PACK', planId, redirectUrl } = body

        if (!amount || amount <= 0) {
            return new NextResponse('Invalid amount', { status: 400 })
        }

        const ypmn = new YpmnService()

        // Generate reference: type:userId:planId:uuid
        // We need to be able to parse this in the webhook
        // Separator: '::'
        const referenceId = uuidv4()
        const merchantPaymentReference = `${type}::${session.user.id}::${planId || 'NONE'}::${referenceId}`

        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: { email: true, name: true, id: true },
        })

        if (!user) {
            return new NextResponse('User not found', { status: 404 })
        }

        const paymentResult = await ypmn.initPayment({
            merchantPaymentReference,
            amount: amount,
            currency: 'RUB',
            returnUrl: redirectUrl || `${process.env.NEXT_PUBLIC_APP_URL}/billing`,
            description: type === 'SUB' ? `Subscription ${planId}` : `PU Pack ${amount} RUB`,
            customer: {
                id: user.id,
                email: user.email || undefined,
            },
            items: [
                {
                    name: type === 'SUB' ? `Subscription ${planId}` : `PU Pack`,
                    price: amount,
                    quantity: 1,
                    amount: amount,
                },
            ],
        })

        // Expecting response to contain redirect URL
        // YPMN response structure: { result: { url: string }, ... } OR just redirect depending on split?
        // Docs say: "В ответе ... paymentResult ... url"
        // Let's assume standard response format.
        // Based on docs visualization (step 54 seems to be snippets), usually it returns an object.
        // I'll return the whole result to the frontend and let it handle the redirect.

        // Standardize response for frontend
        const paymentUrl = paymentResult?.result?.url || paymentResult?.data?.url || paymentResult?.url

        if (!paymentUrl) {
            console.error('YPMN Init Response missing URL:', paymentResult)
            return new NextResponse('Failed to retrieve payment URL from payment provider', { status: 502 })
        }

        return NextResponse.json({ paymentUrl })
    } catch (error: any) {
        console.error('Payment init error:', error)
        return new NextResponse(error.message || 'Internal Server Error', { status: 500 })
    }
}

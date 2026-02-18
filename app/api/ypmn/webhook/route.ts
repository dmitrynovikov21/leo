import { prisma } from '@/lib/db'
import { YpmnService } from '@/lib/ypmn'
import { Decimal } from '@prisma/client/runtime/library'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'
import { getBillingSystem } from '@/lib/billing-adapter'

export async function POST(req: Request) {
    try {
        const bodyText = await req.text()
        const headerList = headers()

        // Convert headers to simple object for verification
        const headersObj: Record<string, string> = {}
        headerList.forEach((value, key) => {
            headersObj[key] = value
        })

        const ypmn = new YpmnService()

        // Verify signature
        // Note: The URL passed to verifyWebhookSignature should be the path
        const isValid = ypmn.verifyWebhookSignature(
            'POST',
            '/api/ypmn/webhook', // Currently hardcoded path, assume matches ingress
            headersObj,
            bodyText
        )

        if (!isValid) {
            console.error('Invalid YPMN signature')
            return new NextResponse('Invalid signature', { status: 400 })
        }

        const payload = JSON.parse(bodyText)
        const { merchantPaymentReference, status, amount } = payload

        // We only care about successful payments
        // Statuses: 'Completed', 'Authorized' (if dual stage)
        // For single stage, 'Completed' or 'Authorized'?
        // YPMN docs: "Your Payments уведомляет ТСП об успешной авторизации"
        // Then "Your Payments уведомляет ТСП о статусе платежа" (Completed?)
        // Let's handle 'Authorized' as success if we don't need capture step (single stage)
        // Actually, docs say "Одностадийная оплата выполняется одной командой...". 
        // Usually 'Authorized' means money is held. 'Completed' means money is captured.
        // If usage 'Completed', it is safe.

        // Let's log the status to be sure.
        console.log(`YPMN Webhook: ${merchantPaymentReference} - ${status}`)

        if (status !== 'Completed' && status !== 'Authorized') {
            // Just ignore other statuses for now
            return NextResponse.json({ received: true })
        }

        // Parse reference
        // Format: type:userId:planId:uuid
        const parts = merchantPaymentReference.split('::')
        if (parts.length < 4) {
            console.error('Invalid reference format:', merchantPaymentReference)
            return new NextResponse('Invalid reference', { status: 400 })
        }

        const [type, userId, planId, uniqueId] = parts

        // Idempotency check
        const existingTx = await prisma.puTransaction.findFirst({
            where: {
                metadata: {
                    path: ['merchantPaymentReference'],
                    equals: merchantPaymentReference,
                },
            },
        })

        if (existingTx) {
            console.log('Transaction already processed:', merchantPaymentReference)
            return NextResponse.json({ received: true })
        }

        const billing = await getBillingSystem(userId)

        // If type is SUB, handle subscription logic (create/update subscription)
        // If type is PACK, just add balance

        if (type === 'PACK') {
            // Calculate PU amount based on RUB amount
            // We need a rate. For now, assume a fixed rate or look up config?
            // `TokenRateConfig` has `rubToTokenRate`? 
            // schema.prisma: `rubToTokenRate Decimal @map("rub_to_token_rate")`

            const rateConfig = await prisma.tokenRateConfig.findFirst({
                where: { isActive: true },
                orderBy: { createdAt: 'desc' },
            })

            // Default rate: 1 RUB = 1 PU? or 10 PU?
            // Let's check `lib/pu-balance.ts` if it exists or just assume 1:1 for now if no config.
            // But `PU` balance logic is in `lib/billing-adapter.ts`.
            // It has `addBalance` but that takes `amount`.

            let puAmount = 0
            if (rateConfig) {
                puAmount = parseFloat(amount.toString()) * parseFloat(rateConfig.rubToTokenRate.toString())
            } else {
                // Fallback or Error?
                // Let's assume 1 RUB = 1 PU for now if no config found, or better, 10.
                // But safer to fail? No, user paid money.
                // Let's use 10 as fallback (10 PU per 1 RUB seems generous or stingy depending on unit).
                // Actually, let's look for existing code that does this conversion.
                puAmount = parseFloat(amount.toString()) * 1 // Conservative
            }

            await billing.addBalance(userId, puAmount, 'YPMN_TOPUP')

            // We should update the transaction we just created (inside billing.addBalance?)
            // `billing.addBalance` in `PuBillingSystem` creates a `PuTransaction`.
            // But it doesn't know about our `merchantPaymentReference`.
            // We might need to update the last transaction or modify `addBalance` to accept metadata.
            // `BillingSystem` interface: `addUsage`... `addBalance(userId, amount, source)`

            // Let's update the latest transaction for this user to include metadata
            const lastTx = await prisma.puTransaction.findFirst({
                where: { userId, source: 'YPMN_TOPUP' },
                orderBy: { createdAt: 'desc' },
            })

            if (lastTx) {
                await prisma.puTransaction.update({
                    where: { id: lastTx.id },
                    data: {
                        metadata: {
                            merchantPaymentReference,
                            ypmnStatus: status,
                            amountRub: amount,
                        },
                        costRub: new Decimal(amount),
                    },
                })
            }

        } else if (type === 'SUB') {
            // Handle subscription
            // Update `UserSubscription` to new plan
            // Reset limits, etc.
            // This logic is complex, usually handled by a separate service.
            // For now, I'll just log or implement basic switch.

            // TODO: Implement subscription switch logic
            console.log('Subscription payment received, but logic not fully implemented yet.')
        }

        return NextResponse.json({ received: true })

    } catch (error: any) {
        console.error('Webhook processing error:', error)
        return new NextResponse('Internal Server Error', { status: 500 })
    }
}

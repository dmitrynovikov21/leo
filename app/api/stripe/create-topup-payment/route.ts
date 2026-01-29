import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { stripe } from '@/lib/stripe'
import { getActiveRateConfig } from '@/lib/token-rates'

export async function POST(req: Request) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { amount } = body // Amount in rubles

    if (!amount || amount <= 0) {
      return NextResponse.json(
        { error: 'Invalid amount. Must be greater than 0.' },
        { status: 400 }
      )
    }

    // Get active rate config to calculate tokens
    let rateConfig
    try {
      rateConfig = await getActiveRateConfig()
    } catch (e) {
      return NextResponse.json(
        { error: 'Token rate configuration not found' },
        { status: 500 }
      )
    }

    const tokensToAdd = amount * rateConfig.rubToTokenRate

    // Create payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to kopeks
      currency: 'rub',
      metadata: {
        userId: session.user.id,
        tokensToAdd: tokensToAdd.toString(),
        amountRub: amount.toString(),
        type: 'token_topup',
      },
      description: `Token top-up: ${tokensToAdd} tokens for ${session.user.email || 'user'}`,
    })

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      amount,
      tokensToAdd,
    })
  } catch (error) {
    console.error('Error creating payment intent:', error)
    return NextResponse.json(
      { error: 'Failed to create payment intent' },
      { status: 500 }
    )
  }
}

import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import { NextResponse } from "next/server"

export async function GET() {
    try {
        const session = await auth()
        if (!session?.user?.id) {
            return new NextResponse("Unauthorized", { status: 401 })
        }

        const sub = await prisma.userSubscription.findUnique({
            where: { userId: session.user.id },
            include: { plan: true },
        })

        if (!sub) {
            return NextResponse.json({
                planName: 'Free',
                planCode: 'FREE',
                priceRub: 0,
                nextResetDate: null,
                status: 'ACTIVE',
                features: [],
            })
        }

        const features = Array.isArray(sub.plan.features)
            ? (sub.plan.features as any[]).filter(f => f.included).map(f => f.text)
            : []

        return NextResponse.json({
            planName: sub.plan.name,
            planCode: sub.plan.code,
            priceRub: sub.plan.priceMonthlyRub.toNumber(),
            nextResetDate: sub.nextResetDate.toISOString(),
            status: sub.status,
            features,
        })
    } catch {
        return new NextResponse("Internal error", { status: 500 })
    }
}

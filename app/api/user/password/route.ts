import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import { NextResponse } from "next/server"
import { z } from "zod"
import bcrypt from "bcryptjs"

const passwordSchema = z.object({
    currentPassword: z.string().optional().default(''),
    newPassword: z.string().min(6, 'Минимум 6 символов'),
})

export async function PATCH(req: Request) {
    try {
        const session = await auth()

        if (!session?.user) {
            return new NextResponse("Unauthorized", { status: 403 })
        }

        const json = await req.json()
        const body = passwordSchema.parse(json)

        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: { password: true },
        })

        if (!user) {
            return new NextResponse("Пользователь не найден", { status: 404 })
        }

        if (user.password) {
            // User has a password — verify current before allowing change
            if (!body.currentPassword) {
                return new NextResponse("Введите текущий пароль", { status: 400 })
            }
            const isValid = await bcrypt.compare(body.currentPassword, user.password)
            if (!isValid) {
                return new NextResponse("Неверный текущий пароль", { status: 400 })
            }
        }
        // If user.password is null (OAuth user) — allow setting password without currentPassword

        const hashedPassword = await bcrypt.hash(body.newPassword, 10)

        await prisma.user.update({
            where: { id: session.user.id },
            data: { password: hashedPassword },
        })

        return new NextResponse("Пароль успешно обновлён", { status: 200 })
    } catch (error) {
        if (error instanceof z.ZodError) {
            return new NextResponse(JSON.stringify(error.issues), { status: 422 })
        }

        return new NextResponse(null, { status: 500 })
    }
}

// GET — check if user has a password set
export async function GET() {
    try {
        const session = await auth()
        if (!session?.user) {
            return new NextResponse("Unauthorized", { status: 403 })
        }

        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: { password: true },
        })

        return NextResponse.json({ hasPassword: !!user?.password })
    } catch {
        return new NextResponse(null, { status: 500 })
    }
}

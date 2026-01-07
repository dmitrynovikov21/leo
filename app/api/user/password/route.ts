import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import { userPasswordSchema } from "@/lib/validations/user"
import { NextResponse } from "next/server"
import { z } from "zod"
import bcrypt from "bcryptjs"

export async function PATCH(req: Request) {
    try {
        const session = await auth()

        if (!session?.user) {
            return new NextResponse("Unauthorized", { status: 403 })
        }

        const json = await req.json()
        const body = userPasswordSchema.parse(json)

        const user = await prisma.user.findUnique({
            where: {
                id: session.user.id,
            },
            select: {
                password: true,
            },
        })

        if (!user) {
            return new NextResponse("User not found", { status: 404 })
        }

        if (user.password) {
            const isValid = await bcrypt.compare(body.currentPassword, user.password)
            if (!isValid) {
                return new NextResponse("Invalid current password", { status: 400 })
            }
        } else {
            // If user has no password (e.g. OAuth), they must set one first via another flow, 
            // OR we can allow setting it if we verified their email, etc.
            // For now, assuming standard flow where they have a password or we require one.
            // If they logged in via Google and want to set a password, they might not have a current one.
            // But the schema requires currentPassword.
            // Let's assume for this task they are updating, so they must have one.
            // Or specific logic: if no password set, skip currentPassword check?
            // But user asked for "change password", implying upgrade/update.
            // I will stick to requiring current password if one exists.

            // Wait, if no password, they can't provide current. 
            // If they registered via Google, user.password is null.
            // But the UI shows "Current Password".
            // I'll return specific error if they don't have a password set to allow potential UI handling,
            // but for now I'll just error out if they try to change it without having one (or force them to use forgot password).
            // Actually, better: if (!user.password), we can't verify 'current', so we might error.
            if (!user.password) {
                return new NextResponse("You don't have a password set. Use 'Forgot Password' or sign in with provider.", { status: 400 })
            }
        }

        const hashedPassword = await bcrypt.hash(body.newPassword, 10)

        await prisma.user.update({
            where: {
                id: session.user.id,
            },
            data: {
                password: hashedPassword,
            },
        })

        return new NextResponse("Password updated successfully", { status: 200 })
    } catch (error) {
        if (error instanceof z.ZodError) {
            return new NextResponse(JSON.stringify(error.issues), { status: 422 })
        }

        return new NextResponse(null, { status: 500 })
    }
}

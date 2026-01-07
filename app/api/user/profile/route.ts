import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import { userProfileSchema } from "@/lib/validations/user"
import { NextResponse } from "next/server"
import { z } from "zod"

export async function GET(req: Request) {
    try {
        const session = await auth()

        if (!session?.user) {
            return new NextResponse("Unauthorized", { status: 403 })
        }

        const user = await prisma.user.findUnique({
            where: {
                id: session.user.id,
            },
            select: {
                id: true,
                name: true,
                email: true,
                image: true,
                jobTitle: true,
                timezone: true,
                bio: true,
            },
        })

        if (!user) {
            return new NextResponse("User not found", { status: 404 })
        }

        return NextResponse.json(user)
    } catch (error) {
        console.error("[PROFILE_GET]", error)
        return new NextResponse(null, { status: 500 })
    }
}

export async function PATCH(req: Request) {
    try {
        const session = await auth()

        if (!session?.user) {
            return new NextResponse("Unauthorized", { status: 403 })
        }

        const json = await req.json()
        const body = userProfileSchema.parse(json)

        const updatedUser = await prisma.user.update({
            where: {
                id: session.user.id,
            },
            data: {
                name: body.name,
                jobTitle: body.jobTitle,
                timezone: body.timezone,
                bio: body.bio,
            },
            select: {
                id: true,
                name: true,
                jobTitle: true,
                timezone: true,
                bio: true,
                image: true,
            },
        })

        return NextResponse.json(updatedUser)
    } catch (error) {
        if (error instanceof z.ZodError) {
            return new NextResponse(JSON.stringify(error.issues), { status: 422 })
        }

        return new NextResponse(null, { status: 500 })
    }
}

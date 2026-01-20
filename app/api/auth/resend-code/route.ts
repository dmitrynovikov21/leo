import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { sendVerificationCode } from "@/lib/email";

export async function POST(req: Request) {
    try {
        const { email } = await req.json();

        if (!email) {
            return NextResponse.json(
                { message: "Email is required" },
                { status: 400 }
            );
        }

        // Find user by email
        const user = await prisma.user.findUnique({
            where: { email: email.toLowerCase() },
        });

        if (!user) {
            return NextResponse.json(
                { message: "User not found" },
                { status: 404 }
            );
        }

        // Already verified
        if (user.emailVerified) {
            return NextResponse.json(
                { message: "Email already verified" },
                { status: 400 }
            );
        }

        // Rate limiting: max 3 codes per hour
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
        const recentCodes = await prisma.emailVerificationCode.count({
            where: {
                userId: user.id,
                createdAt: {
                    gt: oneHourAgo,
                },
            },
        });

        if (recentCodes >= 3) {
            return NextResponse.json(
                { message: "Too many attempts. Please try again later." },
                { status: 429 }
            );
        }

        // Generate verification code (hardcoded for now until email is configured)
        const code = "123456"; // TODO: enable random code when email is ready
        const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

        await prisma.emailVerificationCode.deleteMany({
            where: { userId: user.id },
        });

        await prisma.emailVerificationCode.create({
            data: {
                userId: user.id,
                code,
                expiresAt,
            },
        });

        // TODO: enable email sending when configured
        // await sendVerificationCode(
        //     user.email!,
        //     code,
        //     user.name || "User"
        // );

        return NextResponse.json(
            { message: "Verification code sent" },
            { status: 200 }
        );
    } catch (error) {
        console.error("Resend code error:", error);
        return NextResponse.json(
            { message: "Something went wrong" },
            { status: 500 }
        );
    }
}

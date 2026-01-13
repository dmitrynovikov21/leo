import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";

export async function POST(req: Request) {
    try {
        const { email, code } = await req.json();

        if (!email || !code) {
            return NextResponse.json(
                { message: "Email and code are required" },
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
                { message: "Email already verified", verified: true },
                { status: 200 }
            );
        }

        // Find valid verification code
        const verificationCode = await prisma.emailVerificationCode.findFirst({
            where: {
                userId: user.id,
                code: code,
                expiresAt: {
                    gt: new Date(),
                },
            },
        });

        if (!verificationCode) {
            return NextResponse.json(
                { message: "Invalid or expired code" },
                { status: 400 }
            );
        }

        // Update user's emailVerified and delete used codes
        await prisma.$transaction([
            prisma.user.update({
                where: { id: user.id },
                data: { emailVerified: new Date() },
            }),
            prisma.emailVerificationCode.deleteMany({
                where: { userId: user.id },
            }),
        ]);

        return NextResponse.json(
            { message: "Email verified successfully", verified: true },
            { status: 200 }
        );
    } catch (error) {
        console.error("Verification error:", error);
        return NextResponse.json(
            { message: "Something went wrong" },
            { status: 500 }
        );
    }
}

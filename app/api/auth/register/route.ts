import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";

import { prisma } from "@/lib/db";
import { userRegisterSchema } from "@/lib/validations/auth";
import { sendVerificationCode } from "@/lib/email";

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { name, email, password } = userRegisterSchema.parse(body);

        // Check if user already exists
        const existingUser = await prisma.user.findUnique({
            where: { email },
        });

        if (existingUser) {
            // If user exists but not verified, resend code
            if (!existingUser.emailVerified) {
                // Generate new verification code
                const code = Math.floor(100000 + Math.random() * 900000).toString();
                const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

                // Delete old codes and create new one
                await prisma.emailVerificationCode.deleteMany({
                    where: { userId: existingUser.id },
                });

                await prisma.emailVerificationCode.create({
                    data: {
                        userId: existingUser.id,
                        code,
                        expiresAt,
                    },
                });

                // Send verification email
                await sendVerificationCode(email, code, existingUser.name || name);

                return NextResponse.json(
                    {
                        message: "Verification code sent",
                        userId: existingUser.id,
                        requiresVerification: true
                    },
                    { status: 200 }
                );
            }

            return NextResponse.json(
                { message: "User with this email already exists" },
                { status: 400 }
            );
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 12);

        // Create user (without emailVerified)
        const user = await prisma.user.create({
            data: {
                name,
                email,
                password: hashedPassword,
                // emailVerified is null - user needs to verify
            },
        });

        // Generate verification code
        const code = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

        await prisma.emailVerificationCode.create({
            data: {
                userId: user.id,
                code,
                expiresAt,
            },
        });

        // Send verification email
        await sendVerificationCode(email, code, name);

        return NextResponse.json(
            {
                message: "Verification code sent to your email",
                userId: user.id,
                requiresVerification: true
            },
            { status: 201 }
        );
    } catch (error) {
        console.error("Registration error:", error);
        return NextResponse.json(
            { message: "Something went wrong" },
            { status: 500 }
        );
    }
}

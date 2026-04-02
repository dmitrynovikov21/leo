import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";

import { prisma } from "@/lib/db";
import { userRegisterSchema } from "@/lib/validations/auth";
import { sendVerificationCode } from "@/lib/email";
import { notifyRegistration } from "@/lib/telegram-notify";

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
                const code = Math.floor(100000 + Math.random() * 900000).toString();
                const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 минут

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

                await sendVerificationCode(email, code, existingUser.name || name);

                return NextResponse.json(
                    {
                        message: "Код подтверждения отправлен",
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

        // Assign FREE subscription
        const freePlan = await prisma.subscriptionPlan.findUnique({ where: { code: 'FREE' } })
        if (freePlan) {
            const now = new Date()
            const nextReset = new Date(now)
            nextReset.setMonth(nextReset.getMonth() + 1)
            await prisma.userSubscription.create({
                data: {
                    userId: user.id,
                    planId: freePlan.id,
                    puBalance: freePlan.monthlyPuLimit,
                    puLimit: freePlan.monthlyPuLimit,
                    billingCycleStartDate: now,
                    nextResetDate: nextReset,
                    status: 'ACTIVE',
                },
            })
        }

        notifyRegistration(email, name);

        const code = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 минут

        await prisma.emailVerificationCode.create({
            data: {
                userId: user.id,
                code,
                expiresAt,
            },
        });

        await sendVerificationCode(email, code, name);

        return NextResponse.json(
            {
                message: "Код подтверждения отправлен на почту",
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

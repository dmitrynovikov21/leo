import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendVerificationCode } from "@/lib/email";

export async function POST(req: Request) {
    try {
        const { email } = await req.json();

        if (!email) {
            return NextResponse.json(
                { message: "Укажите email" },
                { status: 400 }
            );
        }

        const user = await prisma.user.findUnique({
            where: { email: email.toLowerCase() },
        });

        if (!user) {
            return NextResponse.json(
                { message: "Пользователь с таким email не найден" },
                { status: 404 }
            );
        }

        // Rate limiting: макс 3 кода в час
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
        const recentCodes = await prisma.emailVerificationCode.count({
            where: {
                userId: user.id,
                createdAt: { gt: oneHourAgo },
            },
        });

        if (recentCodes >= 3) {
            return NextResponse.json(
                { message: "Слишком много попыток. Попробуйте позже." },
                { status: 429 }
            );
        }

        const code = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 минут

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

        await sendVerificationCode(user.email!, code, user.name || "Пользователь", "password-reset");

        return NextResponse.json(
            { message: "Код отправлен на вашу почту" },
            { status: 200 }
        );
    } catch (error) {
        console.error("Forgot password error:", error);
        return NextResponse.json(
            { message: "Произошла ошибка" },
            { status: 500 }
        );
    }
}

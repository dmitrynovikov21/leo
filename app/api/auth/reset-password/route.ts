import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";

export async function POST(req: Request) {
    try {
        const { email, code, newPassword } = await req.json();

        if (!email || !code || !newPassword) {
            return NextResponse.json(
                { message: "Все поля обязательны" },
                { status: 400 }
            );
        }

        if (newPassword.length < 6) {
            return NextResponse.json(
                { message: "Пароль должен быть минимум 6 символов" },
                { status: 400 }
            );
        }

        const user = await prisma.user.findUnique({
            where: { email: email.toLowerCase() },
        });

        if (!user) {
            return NextResponse.json(
                { message: "Пользователь не найден" },
                { status: 404 }
            );
        }

        // Find valid verification code
        const verificationCode = await prisma.emailVerificationCode.findFirst({
            where: {
                userId: user.id,
                code,
                expiresAt: { gt: new Date() },
            },
        });

        if (!verificationCode) {
            return NextResponse.json(
                { message: "Неверный или просроченный код" },
                { status: 400 }
            );
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);

        await prisma.$transaction([
            prisma.user.update({
                where: { id: user.id },
                data: { password: hashedPassword },
            }),
            prisma.emailVerificationCode.deleteMany({
                where: { userId: user.id },
            }),
        ]);

        return NextResponse.json(
            { message: "Пароль успешно изменён" },
            { status: 200 }
        );
    } catch (error) {
        console.error("Reset password error:", error);
        return NextResponse.json(
            { message: "Произошла ошибка" },
            { status: 500 }
        );
    }
}

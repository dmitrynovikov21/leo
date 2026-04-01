import { Suspense } from "react";
import { Metadata } from "next";
import Link from "next/link";

import { cn, constructMetadata } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { UserAuthForm } from "@/components/forms/user-auth-form";
import { Icons } from "@/components/shared/icons";

export const metadata = constructMetadata({
  title: "Вход – LEO",
  description: "Войдите в свой аккаунт LEO — платформа AI-агентов.",
});

export default function LoginPage() {
  return (
    <div className="container flex h-screen w-screen flex-col items-center justify-center">
      <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]">
        <div className="flex flex-col space-y-2 text-center">
          <Icons.logo className="mx-auto size-6" />
          <h1 className="text-2xl font-semibold tracking-tight">
            С возвращением
          </h1>
          <p className="text-sm text-muted-foreground">
            Введите email для входа в аккаунт
          </p>
        </div>
        <Suspense>
          <UserAuthForm />
        </Suspense>
        <p className="px-8 text-center text-sm text-muted-foreground">
          <Link
            href="/register"
            className="hover:text-brand underline underline-offset-4"
          >
            Нет аккаунта? Зарегистрируйтесь
          </Link>
        </p>
      </div>
    </div>
  );
}


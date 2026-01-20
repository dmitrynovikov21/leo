import Link from "next/link"
import { Suspense } from "react"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"
import { Icons } from "@/components/shared/icons"
import { UserRegisterForm } from "@/components/forms/user-register-form"

export const metadata = {
  title: "Регистрация",
  description: "Создайте аккаунт для начала работы.",
}

export default function RegisterPage() {
  return (
    <div className="container grid h-screen w-screen flex-col items-center justify-center lg:max-w-none lg:grid-cols-2 lg:px-0">
      <Link
        href="/login"
        className={cn(
          buttonVariants({ variant: "ghost" }),
          "absolute right-4 top-4 md:right-8 md:top-8"
        )}
      >
        Войти
      </Link>
      <div className="hidden h-full bg-muted lg:block" />
      <div className="lg:p-8">
        <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]">
          <div className="flex flex-col space-y-2 text-center">
            <Icons.logo className="mx-auto size-6" />
            <h1 className="text-2xl font-semibold tracking-tight">
              Создать аккаунт
            </h1>
            <p className="text-sm text-muted-foreground">
              Введите данные для регистрации
            </p>
          </div>
          <Suspense>
            <UserRegisterForm />
          </Suspense>
          <p className="px-8 text-center text-sm text-muted-foreground">
            Нажимая продолжить, вы соглашаетесь с{" "}
            <Link
              href="/terms"
              className="hover:text-brand underline underline-offset-4"
            >
              Условиями использования
            </Link>{" "}
            и{" "}
            <Link
              href="/privacy"
              className="hover:text-brand underline underline-offset-4"
            >
              Политикой конфиденциальности
            </Link>
            .
          </p>
        </div>
      </div>
    </div>
  )
}


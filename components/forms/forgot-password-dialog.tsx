"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Icons } from "@/components/shared/icons";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface ForgotPasswordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type Step = "email" | "reset";

export function ForgotPasswordDialog({ open, onOpenChange }: ForgotPasswordDialogProps) {
  const [step, setStep] = React.useState<Step>("email");
  const [email, setEmail] = React.useState("");
  const [code, setCode] = React.useState("");
  const [newPassword, setNewPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Reset state when dialog closes
  React.useEffect(() => {
    if (!open) {
      setTimeout(() => {
        setStep("email");
        setEmail("");
        setCode("");
        setNewPassword("");
        setConfirmPassword("");
        setError(null);
      }, 200);
    }
  }, [open]);

  async function handleSendCode(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!email.trim()) {
      setError("Введите email");
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.toLowerCase().trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Произошла ошибка");
        return;
      }

      toast.success("Код отправлен на вашу почту");
      setStep("reset");
    } catch {
      setError("Произошла ошибка. Попробуйте снова.");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!code.trim()) {
      setError("Введите код подтверждения");
      return;
    }

    if (newPassword.length < 6) {
      setError("Пароль должен быть минимум 6 символов");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Пароли не совпадают");
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.toLowerCase().trim(),
          code: code.trim(),
          newPassword,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Произошла ошибка");
        return;
      }

      toast.success("Пароль успешно изменён! Теперь войдите с новым паролем.");
      onOpenChange(false);
    } catch {
      setError("Произошла ошибка. Попробуйте снова.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        {step === "email" ? (
          <>
            <DialogHeader>
              <DialogTitle>Восстановление пароля</DialogTitle>
              <DialogDescription>
                Введите email, на который зарегистрирован аккаунт. Мы отправим код подтверждения.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSendCode} className="grid gap-4 mt-2">
              {error && (
                <div className="rounded-md bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
                  {error}
                </div>
              )}
              <div className="grid gap-1">
                <Label htmlFor="forgot-email">Email</Label>
                <Input
                  id="forgot-email"
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                  autoFocus
                />
              </div>
              <button
                type="submit"
                className={cn(buttonVariants())}
                disabled={isLoading}
              >
                {isLoading && (
                  <Icons.spinner className="mr-2 size-4 animate-spin" />
                )}
                Отправить код
              </button>
            </form>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Новый пароль</DialogTitle>
              <DialogDescription>
                Введите код подтверждения, отправленный на {email}, и задайте новый пароль.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleResetPassword} className="grid gap-4 mt-2">
              {error && (
                <div className="rounded-md bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
                  {error}
                </div>
              )}
              <div className="grid gap-1">
                <Label htmlFor="reset-code">Код подтверждения</Label>
                <Input
                  id="reset-code"
                  type="text"
                  placeholder="123456"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  disabled={isLoading}
                  autoFocus
                  maxLength={6}
                />
              </div>
              <div className="grid gap-1">
                <Label htmlFor="new-password">Новый пароль</Label>
                <Input
                  id="new-password"
                  type="password"
                  placeholder="Минимум 6 символов"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  disabled={isLoading}
                />
              </div>
              <div className="grid gap-1">
                <Label htmlFor="confirm-password">Повторите пароль</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  placeholder="Повторите новый пароль"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={isLoading}
                />
              </div>
              <button
                type="submit"
                className={cn(buttonVariants())}
                disabled={isLoading}
              >
                {isLoading && (
                  <Icons.spinner className="mr-2 size-4 animate-spin" />
                )}
                Сменить пароль
              </button>
              <button
                type="button"
                className={cn(buttonVariants({ variant: "ghost" }), "text-sm")}
                onClick={() => { setStep("email"); setError(null); }}
                disabled={isLoading}
              >
                Отправить код повторно
              </button>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Icons } from "@/components/shared/icons";
import { signIn } from "next-auth/react";

interface VerificationCodeFormProps extends React.HTMLAttributes<HTMLDivElement> {
    email: string;
    password: string;
    onBack?: () => void;
}

export function VerificationCodeForm({
    email,
    password,
    onBack,
    className,
    ...props
}: VerificationCodeFormProps) {
    const router = useRouter();
    const [code, setCode] = React.useState(["", "", "", "", "", ""]);
    const [isLoading, setIsLoading] = React.useState(false);
    const [isResending, setIsResending] = React.useState(false);
    const [countdown, setCountdown] = React.useState(0);
    const inputRefs = React.useRef<(HTMLInputElement | null)[]>([]);

    // Countdown timer for resend button
    React.useEffect(() => {
        if (countdown > 0) {
            const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
            return () => clearTimeout(timer);
        }
    }, [countdown]);

    const handleInputChange = (index: number, value: string) => {
        // Only allow digits
        if (value && !/^\d$/.test(value)) return;

        const newCode = [...code];
        newCode[index] = value;
        setCode(newCode);

        // Auto-focus next input
        if (value && index < 5) {
            inputRefs.current[index + 1]?.focus();
        }

        // Auto-submit when all digits entered
        if (newCode.every(digit => digit !== "")) {
            handleSubmit(newCode.join(""));
        }
    };

    const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Backspace" && !code[index] && index > 0) {
            inputRefs.current[index - 1]?.focus();
        }
    };

    const handlePaste = (e: React.ClipboardEvent) => {
        e.preventDefault();
        const pastedData = e.clipboardData.getData("text").slice(0, 6);
        if (!/^\d+$/.test(pastedData)) return;

        const newCode = [...code];
        for (let i = 0; i < pastedData.length; i++) {
            newCode[i] = pastedData[i];
        }
        setCode(newCode);

        if (pastedData.length === 6) {
            handleSubmit(pastedData);
        } else {
            inputRefs.current[pastedData.length]?.focus();
        }
    };

    async function handleSubmit(codeString: string) {
        setIsLoading(true);

        try {
            const response = await fetch("/api/auth/verify-code", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    email: email.toLowerCase(),
                    code: codeString,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || "Verification failed");
            }

            toast.success("Email verified!", {
                description: "Signing you in...",
            });

            // Auto sign in after verification
            const signInResult = await signIn("credentials", {
                email: email.toLowerCase(),
                password,
                redirect: false,
            });

            if (signInResult?.ok) {
                router.push("/dashboard");
            } else {
                router.push("/login");
            }
        } catch (error) {
            toast.error("Verification failed", {
                description: error instanceof Error ? error.message : "Please try again.",
            });
            // Clear code on error
            setCode(["", "", "", "", "", ""]);
            inputRefs.current[0]?.focus();
        } finally {
            setIsLoading(false);
        }
    }

    async function handleResendCode() {
        setIsResending(true);

        try {
            const response = await fetch("/api/auth/resend-code", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: email.toLowerCase() }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || "Failed to resend code");
            }

            toast.success("Code sent!", {
                description: "Check your email for the new code.",
            });
            setCountdown(60); // 60 second cooldown
        } catch (error) {
            toast.error("Failed to resend code", {
                description: error instanceof Error ? error.message : "Please try again.",
            });
        } finally {
            setIsResending(false);
        }
    }

    return (
        <div className={cn("grid gap-6", className)} {...props}>
            <div className="flex flex-col space-y-2 text-center">
                <h1 className="text-2xl font-semibold tracking-tight">
                    Verify your email
                </h1>
                <p className="text-sm text-muted-foreground">
                    We sent a 6-digit code to <strong>{email}</strong>
                </p>
            </div>

            <div className="grid gap-4">
                <div className="flex justify-center gap-2">
                    {code.map((digit, index) => (
                        <Input
                            key={index}
                            ref={(el) => {
                                inputRefs.current[index] = el;
                            }}
                            type="text"
                            inputMode="numeric"
                            maxLength={1}
                            value={digit}
                            onChange={(e) => handleInputChange(index, e.target.value)}
                            onKeyDown={(e) => handleKeyDown(index, e)}
                            onPaste={handlePaste}
                            disabled={isLoading}
                            className="h-12 w-12 text-center text-lg font-semibold"
                            autoFocus={index === 0}
                        />
                    ))}
                </div>

                <button
                    type="button"
                    className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
                    onClick={handleResendCode}
                    disabled={isResending || countdown > 0}
                >
                    {isResending && (
                        <Icons.spinner className="mr-2 size-4 animate-spin" />
                    )}
                    {countdown > 0
                        ? `Resend code in ${countdown}s`
                        : "Resend code"
                    }
                </button>

                {onBack && (
                    <button
                        type="button"
                        className={cn(buttonVariants({ variant: "outline" }))}
                        onClick={onBack}
                        disabled={isLoading}
                    >
                        Back to registration
                    </button>
                )}
            </div>
        </div>
    );
}

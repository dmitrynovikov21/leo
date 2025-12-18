"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";

import { cn } from "@/lib/utils";
import { userRegisterSchema } from "@/lib/validations/auth";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Icons } from "@/components/shared/icons";
import { signIn } from "next-auth/react";

interface UserRegisterFormProps extends React.HTMLAttributes<HTMLDivElement> { }

type FormData = z.infer<typeof userRegisterSchema>;

export function UserRegisterForm({ className, ...props }: UserRegisterFormProps) {
    const router = useRouter();
    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<FormData>({
        resolver: zodResolver(userRegisterSchema),
    });
    const [isLoading, setIsLoading] = React.useState<boolean>(false);
    const [isGoogleLoading, setIsGoogleLoading] = React.useState<boolean>(false);

    async function onSubmit(data: FormData) {
        setIsLoading(true);

        try {
            const response = await fetch("/api/auth/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: data.name,
                    email: data.email.toLowerCase(),
                    password: data.password,
                }),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || "Registration failed");
            }

            toast.success("Account created!", {
                description: "You can now sign in with your credentials.",
            });

            // Auto sign in after registration
            const signInResult = await signIn("credentials", {
                email: data.email.toLowerCase(),
                password: data.password,
                redirect: false,
            });

            if (signInResult?.ok) {
                router.push("/dashboard");
            } else {
                router.push("/login");
            }
        } catch (error) {
            toast.error("Registration failed", {
                description: error instanceof Error ? error.message : "Please try again.",
            });
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <div className={cn("grid gap-6", className)} {...props}>
            <form onSubmit={handleSubmit(onSubmit)}>
                <div className="grid gap-4">
                    <div className="grid gap-1">
                        <Label htmlFor="name">Name</Label>
                        <Input
                            id="name"
                            placeholder="John Doe"
                            type="text"
                            autoCapitalize="words"
                            autoComplete="name"
                            disabled={isLoading || isGoogleLoading}
                            {...register("name")}
                        />
                        {errors?.name && (
                            <p className="px-1 text-xs text-red-600">
                                {errors.name.message}
                            </p>
                        )}
                    </div>
                    <div className="grid gap-1">
                        <Label htmlFor="email">Email</Label>
                        <Input
                            id="email"
                            placeholder="name@example.com"
                            type="email"
                            autoCapitalize="none"
                            autoComplete="email"
                            autoCorrect="off"
                            disabled={isLoading || isGoogleLoading}
                            {...register("email")}
                        />
                        {errors?.email && (
                            <p className="px-1 text-xs text-red-600">
                                {errors.email.message}
                            </p>
                        )}
                    </div>
                    <div className="grid gap-1">
                        <Label htmlFor="password">Password</Label>
                        <Input
                            id="password"
                            placeholder="••••••••"
                            type="password"
                            autoComplete="new-password"
                            disabled={isLoading || isGoogleLoading}
                            {...register("password")}
                        />
                        {errors?.password && (
                            <p className="px-1 text-xs text-red-600">
                                {errors.password.message}
                            </p>
                        )}
                    </div>
                    <button className={cn(buttonVariants())} disabled={isLoading}>
                        {isLoading && (
                            <Icons.spinner className="mr-2 size-4 animate-spin" />
                        )}
                        Create Account
                    </button>
                </div>
            </form>
            <div className="relative">
                <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">
                        Or continue with
                    </span>
                </div>
            </div>
            <button
                type="button"
                className={cn(buttonVariants({ variant: "outline" }))}
                onClick={() => {
                    setIsGoogleLoading(true);
                    signIn("google");
                }}
                disabled={isLoading || isGoogleLoading}
            >
                {isGoogleLoading ? (
                    <Icons.spinner className="mr-2 size-4 animate-spin" />
                ) : (
                    <Icons.google className="mr-2 size-4" />
                )}{" "}
                Google
            </button>
        </div>
    );
}

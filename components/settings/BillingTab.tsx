"use client"

import { Button } from "@/components/ui/button"
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import { Check, Zap } from "lucide-react"

import { useUser } from "@/components/providers/user-data-provider"
import { Skeleton } from "@/components/ui/skeleton"
import { YpmnButton } from "@/components/forms/YpmnButton"

export function BillingTab() {
    const { userData, isLoading } = useUser()

    if (isLoading) {
        return <div className="space-y-6">
            <Skeleton className="h-[400px] w-full rounded-2xl" />
        </div>
    }

    const plan = userData?.profile.plan || 'free'

    const getPlanDetails = (planId: string) => {
        switch (planId) {
            case 'enterprise':
                return { name: 'Enterprise Plan', price: 'Custom', label: 'Enterprise' }
            case 'pro':
                return { name: 'Pro Plan', price: '$29 / месяц', label: 'Pro' }
            default:
                return { name: 'Free Plan', price: '$0 / месяц', label: 'Free' }
        }
    }

    const planDetails = getPlanDetails(plan)

    return (
        <div className="space-y-6">
            <Card className="border border-border shadow-[0_2px_8px_rgba(0,0,0,0.04)] bg-card rounded-2xl">
                <CardHeader>
                    <CardTitle className="text-xl font-bold text-foreground">Тарифный план</CardTitle>
                    <CardDescription className="text-muted-foreground">
                        Вы используете план <span className="font-semibold text-foreground capitalize">{planDetails.label}</span>.
                    </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-6">
                    <div className="flex items-center justify-between border border-border p-4 rounded-xl bg-muted/30">
                        <div className="flex items-center gap-4">
                            <div className="h-12 w-12 rounded-xl bg-primary flex items-center justify-center shadow-sm">
                                <Zap className="h-6 w-6 text-primary-foreground" />
                            </div>
                            <div>
                                <div className="font-bold text-lg text-foreground">{planDetails.name}</div>
                                <div className="text-sm font-medium text-muted-foreground">{planDetails.price}</div>
                            </div>
                        </div>
                        <Button variant="outline" className="rounded-xl border-border hover:bg-muted shadow-sm font-medium text-foreground">Изменить план</Button>
                    </div>

                    <div className="space-y-3">
                        <div className="text-sm font-semibold text-foreground">Доступные возможности</div>
                        <ul className="grid gap-2.5 text-sm text-muted-foreground font-medium">
                            <li className="flex items-center gap-2">
                                <div className="h-5 w-5 rounded-full bg-green-100 dark:bg-green-950/30 flex items-center justify-center shrink-0">
                                    <Check className="h-3 w-3 text-green-600 dark:text-green-400" />
                                </div>
                                Неограниченное количество агентов
                            </li>
                            <li className="flex items-center gap-2">
                                <div className="h-5 w-5 rounded-full bg-green-100 dark:bg-green-950/30 flex items-center justify-center shrink-0">
                                    <Check className="h-3 w-3 text-green-600 dark:text-green-400" />
                                </div>
                                Приоритетная поддержка
                            </li>
                            <li className="flex items-center gap-2">
                                <div className="h-5 w-5 rounded-full bg-green-100 dark:bg-green-950/30 flex items-center justify-center shrink-0">
                                    <Check className="h-3 w-3 text-green-600 dark:text-green-400" />
                                </div>
                                Расширенная аналитика
                            </li>
                            <li className="flex items-center gap-2">
                                <div className="h-5 w-5 rounded-full bg-green-100 dark:bg-green-950/30 flex items-center justify-center shrink-0">
                                    <Check className="h-3 w-3 text-green-600 dark:text-green-400" />
                                </div>
                                API доступ
                            </li>
                        </ul>
                    </div>
                </CardContent>
                <CardFooter className="flex justify-between border-t border-border pt-6 pb-6 px-6">
                    <div className="text-sm text-muted-foreground font-medium">
                        Следующее списание: <span className="font-semibold text-foreground">1 января 2026</span>
                    </div>
                    <Button variant="ghost" className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-xl font-medium">
                        Отменить подписку
                    </Button>
                </CardFooter>
            </Card>

            <Card className="border border-border shadow-[0_2px_8px_rgba(0,0,0,0.04)] bg-card rounded-2xl">
                <CardHeader>
                    <CardTitle className="text-xl font-bold text-foreground">Пополнение баланса (PU)</CardTitle>
                    <CardDescription className="text-muted-foreground">Пополните баланс для использования AI моделей.</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-6">
                    <div className="flex items-center justify-between border border-border p-4 rounded-xl bg-muted/30">
                        <div className="flex items-center gap-4">
                            <div className="font-bold text-lg text-foreground">100 PU</div>
                            <div className="text-sm font-medium text-muted-foreground">100 RUB</div>
                        </div>
                        <YpmnButton amount={100} label="Купить (100₽)" className="rounded-xl" />
                    </div>
                    <div className="flex items-center justify-between border border-border p-4 rounded-xl bg-muted/30">
                        <div className="flex items-center gap-4">
                            <div className="font-bold text-lg text-foreground">500 PU</div>
                            <div className="text-sm font-medium text-muted-foreground">500 RUB</div>
                        </div>
                        <YpmnButton amount={500} label="Купить (500₽)" className="rounded-xl" />
                    </div>
                </CardContent>
            </Card>

            <Card className="border border-border shadow-[0_2px_8px_rgba(0,0,0,0.04)] bg-card rounded-2xl">
                <CardHeader>
                    <CardTitle className="text-xl font-bold text-foreground">История платежей</CardTitle>
                    <CardDescription className="text-muted-foreground">Скачать инвойсы и просмотреть историю оплат.</CardDescription>
                </CardHeader>
                <CardContent className="pb-8">
                    <div className="text-sm text-muted-foreground font-medium text-center py-12 bg-muted/30 rounded-xl border border-dashed border-border">
                        История платежей пуста.
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}

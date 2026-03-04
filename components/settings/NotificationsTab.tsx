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
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"

export function NotificationsTab() {
    return (
        <Card className="border border-border shadow-[0_2px_8px_rgba(0,0,0,0.04)] bg-card rounded-2xl">
            <CardHeader>
                <CardTitle className="text-xl font-bold text-foreground">Уведомления</CardTitle>
                <CardDescription className="text-muted-foreground">
                    Выберите, какие уведомления вы хотите получать.
                </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-6">
                <div className="flex items-center justify-between space-x-2 p-4 rounded-xl bg-muted border border-border">
                    <Label htmlFor="updates" className="flex flex-col space-y-1 cursor-pointer">
                        <span className="font-semibold text-foreground">Обновления продукта</span>
                        <span className="font-medium text-xs text-muted-foreground">
                            Новости о новых функциях и улучшениях.
                        </span>
                    </Label>
                    <Switch id="updates" defaultChecked />
                </div>
                <div className="flex items-center justify-between space-x-2 p-4 rounded-xl bg-muted border border-border">
                    <Label htmlFor="activity" className="flex flex-col space-y-1 cursor-pointer">
                        <span className="font-semibold text-foreground">Активность агентов</span>
                        <span className="font-medium text-xs text-muted-foreground">
                            Еженедельный отчет о работе ваших агентов.
                        </span>
                    </Label>
                    <Switch id="activity" defaultChecked />
                </div>
                <div className="flex items-center justify-between space-x-2 p-4 rounded-xl bg-muted border border-border">
                    <Label htmlFor="billing" className="flex flex-col space-y-1 cursor-pointer">
                        <span className="font-semibold text-foreground">Уведомления по оплате</span>
                        <span className="font-medium text-xs text-muted-foreground">
                            Счета, платежи и предупреждения об окончании подписки.
                        </span>
                    </Label>
                    <Switch id="billing" defaultChecked />
                </div>
                <div className="flex items-center justify-between space-x-2 p-4 rounded-xl bg-muted border border-border opacity-70">
                    <Label htmlFor="security" className="flex flex-col space-y-1">
                        <span className="font-semibold text-foreground">Уведомления безопасности</span>
                        <span className="font-medium text-xs text-muted-foreground">
                            Входы с новых устройств и подозрительная активность.
                        </span>
                    </Label>
                    <Switch id="security" defaultChecked disabled />
                </div>
            </CardContent>
            <CardFooter className="pb-6 px-6 pt-2">
                <Button className="w-full sm:w-auto rounded-xl px-6 bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm font-medium">Сохранить уведомления</Button>
            </CardFooter>
        </Card>
    )
}

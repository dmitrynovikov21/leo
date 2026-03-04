"use client"

import { Button } from "@/components/ui/button"
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import { Key } from "lucide-react"

export function ApiTab() {
    return (
        <Card className="border border-border shadow-[0_2px_8px_rgba(0,0,0,0.04)] bg-card rounded-2xl">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-6">
                <div className="space-y-1">
                    <CardTitle className="text-xl font-bold text-foreground">API Ключи</CardTitle>
                    <CardDescription className="text-muted-foreground">
                        Управляйте ключами доступа к API платформы.
                    </CardDescription>
                </div>
                <Button className="rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm font-medium">
                    <Key className="mr-2 h-4 w-4" /> Создать новый ключ
                </Button>
            </CardHeader>
            <CardContent className="pb-8">
                <div className="flex flex-col items-center justify-center py-12 text-center space-y-4 bg-muted/30 rounded-xl border border-dashed border-border">
                    <div className="h-14 w-14 bg-background rounded-full flex items-center justify-center border border-border shadow-sm">
                        <Key className="h-7 w-7 text-muted-foreground/50" />
                    </div>
                    <div className="space-y-2">
                        <h3 className="text-lg font-bold text-foreground">API ключи не найдены</h3>
                        <p className="text-sm text-muted-foreground font-medium max-w-sm mx-auto">
                            У вас пока нет активных API ключей. Создайте новый ключ, чтобы начать работу с API.
                        </p>
                    </div>
                    <Button variant="outline" className="mt-2 rounded-xl border-border hover:bg-muted text-foreground font-medium shadow-sm">
                        Документация API
                    </Button>
                </div>
            </CardContent>
        </Card>
    )
}

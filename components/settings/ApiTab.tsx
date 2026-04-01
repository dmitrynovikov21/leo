"use client"

import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import { Code2 } from "lucide-react"

export function ApiTab() {
    return (
        <Card className="border border-border shadow-[0_2px_8px_rgba(0,0,0,0.04)] bg-card rounded-2xl">
            <CardHeader>
                <CardTitle className="text-xl font-bold text-foreground">API</CardTitle>
                <CardDescription className="text-muted-foreground">
                    Доступ к API платформы.
                </CardDescription>
            </CardHeader>
            <CardContent className="pb-8">
                <div className="flex flex-col items-center justify-center py-16 text-center space-y-4 bg-muted/40 rounded-xl border border-border">
                    <div className="h-14 w-14 bg-muted rounded-full flex items-center justify-center border border-border">
                        <Code2 className="h-7 w-7 text-muted-foreground/50" />
                    </div>
                    <div className="space-y-2">
                        <h3 className="text-lg font-bold text-muted-foreground">Скоро</h3>
                        <p className="text-sm text-muted-foreground font-medium max-w-sm mx-auto">
                            Раздел API находится в разработке и будет доступен в ближайшее время.
                        </p>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}

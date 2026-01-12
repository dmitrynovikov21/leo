"use client"

import * as React from "react"
import { ShieldCheck, History } from "lucide-react"
import { toast } from "sonner"

import { Switch } from "@/components/ui/switch"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

export function SecurityPanel() {
    const [mfaEnabled, setMfaEnabled] = React.useState(false)

    return (
        <div className="space-y-6">
            <div>
                <h3 className="text-lg font-medium">Безопасность</h3>
                <p className="text-sm text-muted-foreground">
                    Управляйте безопасностью аккаунта и журналом действий.
                </p>
            </div>

            {/* MFA SECTION */}
            <div className="flex flex-row items-center justify-between rounded-lg border p-4 shadow-sm bg-card">
                <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                        <ShieldCheck className="h-4 w-4 text-emerald-500" />
                        <span className="text-base font-medium">Двухфакторная аутентификация</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                        Требовать код подтверждения по email при входе с нового устройства.
                    </p>
                </div>
                <Switch
                    checked={mfaEnabled}
                    onCheckedChange={(val) => {
                        setMfaEnabled(val)
                        if (val) {
                            toast.success("MFA включена", { description: "Теперь при входе будет запрашиваться код." })
                        } else {
                            toast.warning("MFA отключена", { description: "Ваш аккаунт стал менее защищён." })
                        }
                    }}
                />
            </div>

            {/* AUDIT LOG */}
            <Card>
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <History className="h-5 w-5 text-muted-foreground" />
                        <CardTitle>Журнал действий</CardTitle>
                    </div>
                    <CardDescription>
                        Недавние важные действия в вашем рабочем пространстве.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Действие</TableHead>
                                <TableHead>Пользователь</TableHead>
                                <TableHead>Дата</TableHead>
                                <TableHead className="text-right">Статус</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            <TableRow>
                                <TableCell className="font-medium">Вход пользователя</TableCell>
                                <TableCell>dima@example.com</TableCell>
                                <TableCell>Только что</TableCell>
                                <TableCell className="text-right"><Badge variant="outline" className="text-emerald-600 bg-emerald-50 border-emerald-200">Успешно</Badge></TableCell>
                            </TableRow>
                            <TableRow>
                                <TableCell className="font-medium">Обновление биллинга</TableCell>
                                <TableCell>dima@example.com</TableCell>
                                <TableCell>2 часа назад</TableCell>
                                <TableCell className="text-right"><Badge variant="outline" className="text-emerald-600 bg-emerald-50 border-emerald-200">Успешно</Badge></TableCell>
                            </TableRow>
                            <TableRow>
                                <TableCell className="font-medium">Удаление агента "Sales Bot"</TableCell>
                                <TableCell>sarah@example.com</TableCell>
                                <TableCell>Вчера</TableCell>
                                <TableCell className="text-right"><Badge variant="outline" className="text-orange-600 bg-orange-50 border-orange-200">Предупреждение</Badge></TableCell>
                            </TableRow>
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    )
}

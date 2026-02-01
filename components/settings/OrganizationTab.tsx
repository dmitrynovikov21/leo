"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import { EmojiAvatar } from "@/components/shared/emoji-avatar"
import { X, ExternalLink } from "lucide-react"

export function OrganizationTab() {
    /* const members = [
        { id: 1, name: "Dima Novikov", email: "dima@example.com", role: "Owner", avatar: "😎" },
        { id: 2, name: "Alice Smith", email: "alice@example.com", role: "Admin", avatar: "👩‍💻" },
        { id: 3, name: "Bob Jones", email: "bob@example.com", role: "Viewer", avatar: "👨‍💼" },
    ] */

    return (
        <div className="space-y-6">
            {/* Section 1: General */}
            <Card className="border border-zinc-200/50 shadow-[0_2px_8px_rgba(0,0,0,0.04)] bg-white rounded-2xl">
                <CardHeader>
                    <CardTitle className="text-xl font-bold text-zinc-900">Настройки организации</CardTitle>
                    <CardDescription className="text-zinc-500">Общая информация о вашей компании.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="org-name" className="text-zinc-700 font-medium">Отображаемое название</Label>
                        <Input
                            id="org-name"
                            defaultValue="Acme Corp"
                            className="h-11 rounded-xl border-transparent bg-zinc-100/50 focus:bg-white focus:ring-2 focus:ring-zinc-200 transition-all font-medium text-zinc-900"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="support-email" className="text-zinc-700 font-medium">Почта поддержки</Label>
                        <Input
                            id="support-email"
                            defaultValue="support@acme.com"
                            className="h-11 rounded-xl border-transparent bg-zinc-100/50 focus:bg-white focus:ring-2 focus:ring-zinc-200 transition-all font-medium text-zinc-900"
                        />
                    </div>
                </CardContent>
                <CardFooter className="flex justify-end pb-6 px-6">
                    <Button className="rounded-xl h-10 px-6 font-medium bg-zinc-900 text-white hover:bg-zinc-800 shadow-sm">Сохранить изменения</Button>
                </CardFooter>
            </Card>

            {/* Section 2: Plan Info */}
            <Card className="border border-zinc-200/50 shadow-[0_2px_8px_rgba(0,0,0,0.04)] bg-white rounded-2xl">
                <CardHeader>
                    <CardTitle className="text-xl font-bold text-zinc-900">Текущий тариф</CardTitle>
                    <CardDescription className="text-zinc-500">Информация о подписке и лимитах.</CardDescription>
                </CardHeader>
                <CardContent className="flex items-center justify-between pb-8">
                    <div>
                        <div className="font-bold text-lg text-zinc-900">Пробный период</div>
                        <p className="text-sm text-zinc-500 font-medium">Истекает через 14 дней</p>
                    </div>
                    <Button variant="outline" className="rounded-xl h-10 border-zinc-200 hover:bg-zinc-50 text-zinc-700 font-medium">
                        Открыть настройки тарифа <ExternalLink className="ml-2 h-4 w-4" />
                    </Button>
                </CardContent>
            </Card>

            {/* Section 3 & 4: Team */}
            {/* Section 3 & 4: Team - MUTED
            <Card className="border border-zinc-200/50 shadow-[0_2px_8px_rgba(0,0,0,0.04)] bg-white rounded-2xl">
                <CardHeader>
                    <CardTitle className="text-xl font-bold text-zinc-900">Управление командой</CardTitle>
                    <CardDescription className="text-zinc-500">Приглашайте коллег и управляйте доступами.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6 pb-8">
                    <div className="flex gap-3">
                        <Input
                            placeholder="name@example.com"
                            className="h-11 rounded-xl border-transparent bg-zinc-100/50 focus:bg-white focus:ring-2 focus:ring-zinc-200 transition-all font-medium text-zinc-900"
                        />
                        <Button className="h-11 rounded-xl px-6 bg-zinc-900 text-white hover:bg-zinc-800">Отправить</Button>
                    </div>

                    <div className="space-y-3">
                        {members.map((member) => (
                            <div key={member.id} className="flex items-center justify-between p-3 rounded-xl hover:bg-zinc-50 transition-colors border border-transparent hover:border-zinc-100 group">
                                <div className="flex items-center gap-4">
                                    <EmojiAvatar value={member.avatar} size="sm" className="bg-zinc-100 border border-zinc-200" />
                                    <div>
                                        <div className="font-semibold text-sm text-zinc-900">{member.name}</div>
                                        <div className="text-xs text-zinc-500 font-medium">{member.email}</div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <Badge variant="secondary" className="bg-zinc-100 text-zinc-600 hover:bg-zinc-200 border-0 rounded-lg h-7 px-3">
                                        {member.role}
                                    </Badge>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                                        <X size={16} />
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card> 
            */}

            {/* Section 5: Danger Zone */}

        </div>
    )
}

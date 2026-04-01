"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"

export function OrganizationTab() {
    /* const members = [
        { id: 1, name: "Dima Novikov", email: "dima@example.com", role: "Owner", avatar: "😎" },
        { id: 2, name: "Alice Smith", email: "alice@example.com", role: "Admin", avatar: "👩‍💻" },
        { id: 3, name: "Bob Jones", email: "bob@example.com", role: "Viewer", avatar: "👨‍💼" },
    ] */

    return (
        <div className="space-y-6">
            {/* Section 1: General */}
            <Card className="border border-border shadow-[0_2px_8px_rgba(0,0,0,0.04)] bg-card rounded-2xl">
                <CardHeader>
                    <CardTitle className="text-xl font-bold text-foreground">Настройки организации</CardTitle>
                    <CardDescription className="text-muted-foreground">Общая информация о вашей компании.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="org-name" className="text-foreground font-medium">Отображаемое название</Label>
                        <Input
                            id="org-name"
                            defaultValue="Acme Corp"
                            className="h-11 rounded-xl border-transparent bg-muted/50 focus:bg-background focus:ring-2 focus:ring-ring transition-all font-medium text-foreground"
                        />
                    </div>
                </CardContent>
                <CardFooter className="flex justify-end pb-6 px-6">
                    <Button className="rounded-xl h-10 px-6 font-medium bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm">Сохранить изменения</Button>
                </CardFooter>
            </Card>

            {/* Section 3 & 4: Team */}
            {/* Section 3 & 4: Team - MUTED
            <Card className="border border-border shadow-[0_2px_8px_rgba(0,0,0,0.04)] bg-card rounded-2xl">
                <CardHeader>
                    <CardTitle className="text-xl font-bold text-foreground">Управление командой</CardTitle>
                    <CardDescription className="text-muted-foreground">Приглашайте коллег и управляйте доступами.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6 pb-8">
                    <div className="flex gap-3">
                        <Input
                            placeholder="name@example.com"
                            className="h-11 rounded-xl border-transparent bg-muted/50 focus:bg-card focus:ring-2 focus:ring-ring transition-all font-medium text-foreground"
                        />
                        <Button className="h-11 rounded-xl px-6 bg-primary text-primary-foreground hover:bg-primary/90">Отправить</Button>
                    </div>

                    <div className="space-y-3">
                        {members.map((member) => (
                            <div key={member.id} className="flex items-center justify-between p-3 rounded-xl hover:bg-muted/50 transition-colors border border-transparent hover:border-border group">
                                <div className="flex items-center gap-4">
                                    <EmojiAvatar value={member.avatar} size="sm" className="bg-muted border border-border" />
                                    <div>
                                        <div className="font-semibold text-sm text-foreground">{member.name}</div>
                                        <div className="text-xs text-muted-foreground font-medium">{member.email}</div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <Badge variant="secondary" className="bg-muted text-muted-foreground hover:bg-zinc-200 border-0 rounded-lg h-7 px-3">
                                        {member.role}
                                    </Badge>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
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

"use client"

import { useState, useEffect } from "react"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { EmojiAvatar } from "@/components/shared/emoji-avatar"
import { useUserPreferences } from "@/components/providers/user-preferences-provider"
import { Skeleton } from "@/components/ui/skeleton"

export function ProfileTab() {
    const { avatar, setAvatar } = useUserPreferences()
    const [isSaving, setIsSaving] = useState(false)
    const [isLoading, setIsLoading] = useState(true)
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        jobTitle: '',
        timezone: 'utc+3',
    })

    useEffect(() => {
        async function loadProfile() {
            try {
                const res = await fetch('/api/user/profile')
                if (!res.ok) throw new Error('Failed to load profile')
                const data = await res.json()
                setFormData({
                    name: data.name || '',
                    email: data.email || '',
                    jobTitle: data.jobTitle || '',
                    timezone: data.timezone || 'utc+3',
                })
                // setAvatar(data.image) // Do not override avatar from user preferences if it's local only logic, 
                // but usually user preferences syncs with DB. 
                // Let's assume user preferences provider handles avatar separately or we should sync it here?
                // The EmojiAvatar component uses `avatar` from `useUserPreferences`.
            } catch (error) {
                console.error(error)
                toast.error('Не удалось загрузить профиль')
            } finally {
                setIsLoading(false)
            }
        }
        loadProfile()
    }, [])

    const handleSave = async () => {
        setIsSaving(true)
        try {
            const res = await fetch('/api/user/profile', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: formData.name,
                    jobTitle: formData.jobTitle,
                    timezone: formData.timezone,
                    // image: avatar // If we want to save avatar too
                })
            })

            if (!res.ok) throw new Error('Failed to update profile')

            toast.success('Профиль обновлен')
        } catch (error) {
            console.error(error)
            toast.error('Не удалось обновить профиль')
        } finally {
            setIsSaving(false)
        }
    }

    if (isLoading) {
        return <div className="space-y-4">
            <Skeleton className="h-[200px] w-full rounded-2xl" />
        </div>
    }

    return (
        <Card className="border border-border shadow-[0_2px_8px_rgba(0,0,0,0.04)] bg-card rounded-2xl">
            <CardHeader>
                <CardTitle className="text-xl font-bold text-foreground">Профиль</CardTitle>
                <CardDescription className="text-muted-foreground">
                    Управляйте своей личной информацией и настройками профиля.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="fullname" className="text-foreground font-medium">Полное имя</Label>
                        <div className="flex items-center gap-4">
                            <EmojiAvatar
                                value={avatar}
                                onChange={setAvatar}
                                editable
                                size="md"
                                className="h-12 w-12 text-2xl border border-border bg-muted hover:bg-accent hover:border-border transition-all rounded-xl shrink-0"
                            />
                            <Input
                                id="fullname"
                                value={formData.name}
                                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                                className="flex-1 h-11 rounded-xl border-transparent bg-muted/50 focus:bg-background focus:ring-2 focus:ring-ring transition-all font-medium text-foreground"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="role" className="text-foreground font-medium">Должность</Label>
                        <Input
                            id="role"
                            value={formData.jobTitle}
                            onChange={(e) => setFormData(prev => ({ ...prev, jobTitle: e.target.value }))}
                            className="h-11 rounded-xl border-transparent bg-muted/50 focus:bg-background focus:ring-2 focus:ring-ring transition-all font-medium text-foreground"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="timezone" className="text-foreground font-medium">Часовой пояс</Label>
                        <Select
                            value={formData.timezone}
                            onValueChange={(value) => setFormData(prev => ({ ...prev, timezone: value }))}
                        >
                            <SelectTrigger className="h-11 rounded-xl border-transparent bg-muted/50 focus:bg-background focus:ring-2 focus:ring-ring transition-all font-medium text-foreground">
                                <SelectValue placeholder="Выберите часовой пояс" />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl border-border">
                                <SelectItem value="utc-8">Pacific Time (UTC-8)</SelectItem>
                                <SelectItem value="utc-5">Eastern Time (UTC-5)</SelectItem>
                                <SelectItem value="utc+0">London (UTC+0)</SelectItem>
                                <SelectItem value="utc+1">Paris (UTC+1)</SelectItem>
                                <SelectItem value="utc+3">Moscow (UTC+3)</SelectItem>
                                <SelectItem value="utc+7">Bangkok (UTC+7)</SelectItem>
                                <SelectItem value="utc+9">Tokyo (UTC+9)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>



                    <div className="space-y-2">
                        <Label htmlFor="email" className="text-foreground font-medium">Email</Label>
                        <Input
                            id="email"
                            value={formData.email}
                            disabled
                            className="h-11 rounded-xl border-border bg-muted/30 text-muted-foreground font-mono"
                        />
                    </div>
                </div>
            </CardContent>
            <CardFooter className="flex justify-end gap-3 pt-2 pb-6 px-6">
                <Button
                    variant="ghost"
                    className="rounded-xl h-10 px-6 font-medium text-muted-foreground hover:text-foreground hover:bg-muted"
                    onClick={() => window.location.reload()} // Simple reset
                >
                    Отмена
                </Button>
                <Button
                    className="rounded-xl h-10 px-6 font-medium bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm"
                    onClick={handleSave}
                    disabled={isSaving}
                >
                    {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    Сохранить профиль
                </Button>
            </CardFooter>
        </Card>
    )
}

"use client"

import * as React from "react"
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
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Laptop, Smartphone, Tablet, Monitor, Loader2, LogOut, AlertTriangle } from "lucide-react"
import { toast } from "sonner"
import { signOut } from "next-auth/react"

interface SessionDevice {
    browser: string
    os: string
    device: string
}

interface Session {
    id: string
    userAgent: string | null
    ipAddress: string | null
    lastActivity: string
    createdAt: string
    expires: string
    device: SessionDevice
}

export function SecurityTab() {
    const [sessions, setSessions] = React.useState<Session[]>([])
    const [isLoading, setIsLoading] = React.useState(true)
    const [isTerminating, setIsTerminating] = React.useState<string | null>(null)
    const [showLogoutAllDialog, setShowLogoutAllDialog] = React.useState(false)
    const [isLoggingOutAll, setIsLoggingOutAll] = React.useState(false)

    // Fetch sessions on mount
    React.useEffect(() => {
        fetchSessions()
    }, [])

    const fetchSessions = async () => {
        try {
            const res = await fetch('/api/user/sessions')
            if (res.ok) {
                const data = await res.json()
                setSessions(data.sessions || [])
            }
        } catch (error) {
            console.error('Failed to fetch sessions:', error)
            toast.error('Не удалось загрузить сессии')
        } finally {
            setIsLoading(false)
        }
    }

    const handleTerminateSession = async (sessionId: string) => {
        setIsTerminating(sessionId)
        try {
            const res = await fetch(`/api/user/sessions/${sessionId}`, {
                method: 'DELETE'
            })

            if (res.ok) {
                toast.success('Выход из системы...')
                await signOut({ callbackUrl: '/login', redirect: true })
            } else {
                toast.error('Не удалось завершить сессию')
            }
        } catch (error) {
            console.error('Failed to terminate session:', error)
            toast.error('Ошибка при завершении сессии')
        } finally {
            setIsTerminating(null)
        }
    }

    const handleLogoutAll = async () => {
        setIsLoggingOutAll(true)
        try {
            const res = await fetch('/api/user/sessions', {
                method: 'DELETE'
            })

            if (res.ok) {
                toast.success('Выход со всех устройств')
                await signOut({ callbackUrl: '/login', redirect: true })
            } else {
                toast.error('Не удалось выполнить выход')
            }
        } catch (error) {
            console.error('Failed to logout:', error)
            toast.error('Ошибка при выходе')
        } finally {
            setIsLoggingOutAll(false)
        }
    }

    const getDeviceIcon = (device: string) => {
        switch (device) {
            case 'Mobile':
                return Smartphone
            case 'Tablet':
                return Tablet
            case 'Desktop':
            default:
                return Laptop
        }
    }

    const formatLastActivity = (dateStr: string) => {
        const date = new Date(dateStr)
        const now = new Date()
        const diffMs = now.getTime() - date.getTime()
        const diffMins = Math.floor(diffMs / 60000)
        const diffHours = Math.floor(diffMins / 60)
        const diffDays = Math.floor(diffHours / 24)

        if (diffMins < 1) return 'Сейчас'
        if (diffMins < 60) return `${diffMins} мин. назад`
        if (diffHours < 24) return `${diffHours} ч. назад`
        if (diffDays < 7) return `${diffDays} дн. назад`
        return date.toLocaleDateString('ru-RU')
    }

    return (
        <div className="space-y-6">
            {/* Password Card */}
            <Card className="border border-zinc-200/50 shadow-[0_2px_8px_rgba(0,0,0,0.04)] bg-white rounded-2xl">
                <CardHeader>
                    <CardTitle className="text-xl font-bold text-zinc-900">Пароль</CardTitle>
                    <CardDescription className="text-zinc-500">
                        Измените свой пароль для входа в аккаунт.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="current-password" className="text-zinc-700 font-medium">Текущий пароль</Label>
                        <Input
                            id="current-password"
                            type="password"
                            className="h-11 rounded-xl border-transparent bg-zinc-100/50 focus:bg-white focus:ring-2 focus:ring-zinc-200 transition-all font-medium text-zinc-900"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="new-password" className="text-zinc-700 font-medium">Новый пароль</Label>
                        <Input
                            id="new-password"
                            type="password"
                            className="h-11 rounded-xl border-transparent bg-zinc-100/50 focus:bg-white focus:ring-2 focus:ring-zinc-200 transition-all font-medium text-zinc-900"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="confirm-password" className="text-zinc-700 font-medium">Подтвердите пароль</Label>
                        <Input
                            id="confirm-password"
                            type="password"
                            className="h-11 rounded-xl border-transparent bg-zinc-100/50 focus:bg-white focus:ring-2 focus:ring-zinc-200 transition-all font-medium text-zinc-900"
                        />
                    </div>
                </CardContent>
                <CardFooter className="flex justify-end pb-6 px-6">
                    <Button className="rounded-xl h-10 px-6 font-medium bg-zinc-900 text-white hover:bg-zinc-800 shadow-sm">Обновить пароль</Button>
                </CardFooter>
            </Card>

            {/* Sessions Card */}
            <Card className="border border-zinc-200/50 shadow-[0_2px_8px_rgba(0,0,0,0.04)] bg-white rounded-2xl">
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div className="space-y-1">
                            <CardTitle className="text-xl font-bold text-zinc-900">Активные сессии</CardTitle>
                            <CardDescription className="text-zinc-500">
                                Устройства, с которых выполнен вход в ваш аккаунт.
                            </CardDescription>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="text-xs font-semibold text-zinc-500 bg-zinc-100 border border-zinc-200/50 px-3 py-1.5 rounded-lg">
                                {isLoading ? '...' : `${sessions.length} сессий`}
                            </div>
                            {sessions.length > 1 && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="rounded-lg h-8 border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300"
                                    onClick={() => setShowLogoutAllDialog(true)}
                                >
                                    <LogOut className="h-3.5 w-3.5 mr-1.5" />
                                    Выйти везде
                                </Button>
                            )}
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-2 pb-8">
                    {isLoading ? (
                        <div className="flex items-center justify-center py-8">
                            <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
                        </div>
                    ) : sessions.length === 0 ? (
                        <div className="text-center py-8 text-zinc-500">
                            Нет активных сессий
                        </div>
                    ) : (
                        sessions.map((session) => {
                            const DeviceIcon = getDeviceIcon(session.device.device)
                            const isNow = formatLastActivity(session.lastActivity) === 'Сейчас'

                            return (
                                <div
                                    key={session.id}
                                    className="flex items-center justify-between py-3 border-b border-zinc-100 last:border-0 hover:bg-zinc-50 transition-colors px-2 rounded-xl -mx-2"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="h-12 w-12 bg-zinc-100 rounded-xl flex items-center justify-center border border-zinc-200/50">
                                            <DeviceIcon className="h-6 w-6 text-zinc-500" />
                                        </div>
                                        <div>
                                            <div className="font-semibold text-zinc-900 text-sm">
                                                {session.device.os} • {session.device.browser}
                                            </div>
                                            <div className="text-xs font-medium text-zinc-500">
                                                {session.ipAddress || 'IP неизвестен'} • {' '}
                                                <span className={isNow ? 'text-green-600' : ''}>
                                                    {formatLastActivity(session.lastActivity)}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="rounded-lg h-8 border-zinc-200 text-zinc-700 hover:text-red-600 hover:bg-red-50 hover:border-red-100 bg-white shadow-sm"
                                        onClick={() => handleTerminateSession(session.id)}
                                        disabled={isTerminating === session.id}
                                    >
                                        {isTerminating === session.id ? (
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : (
                                            'Завершить'
                                        )}
                                    </Button>
                                </div>
                            )
                        })
                    )}
                </CardContent>
            </Card>

            {/* Logout All Dialog */}
            <Dialog open={showLogoutAllDialog} onOpenChange={setShowLogoutAllDialog}>
                <DialogContent className="sm:max-w-[400px] rounded-2xl p-6 border-zinc-200 shadow-xl">
                    <DialogHeader className="text-center">
                        <div className="mx-auto h-16 w-16 rounded-full bg-amber-100 flex items-center justify-center mb-4">
                            <AlertTriangle className="h-8 w-8 text-amber-600" />
                        </div>
                        <DialogTitle className="text-xl font-bold text-zinc-900">
                            Выйти со всех устройств?
                        </DialogTitle>
                        <DialogDescription className="text-zinc-500 mt-2">
                            Вы будете разлогинены на всех устройствах, включая текущее.
                            Потребуется повторный вход.
                        </DialogDescription>
                    </DialogHeader>

                    <DialogFooter className="flex gap-2 mt-4">
                        <Button
                            variant="outline"
                            className="flex-1 rounded-xl h-11"
                            onClick={() => setShowLogoutAllDialog(false)}
                            disabled={isLoggingOutAll}
                        >
                            Отмена
                        </Button>
                        <Button
                            variant="destructive"
                            className="flex-1 rounded-xl h-11"
                            onClick={() => handleLogoutAll()}
                            disabled={isLoggingOutAll}
                        >
                            {isLoggingOutAll ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                            Да, выйти
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div >
    )
}

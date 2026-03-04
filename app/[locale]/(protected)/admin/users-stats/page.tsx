'use client'

import { useState, useEffect } from 'react'
import { getAdminUserStats, UserStat } from '@/actions/admin-stats'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Search, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { format } from 'date-fns'

export default function UsersStatsPage() {
    const [stats, setStats] = useState<UserStat[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')

    const loadStats = async () => {
        setLoading(true)
        try {
            const data = await getAdminUserStats(50, 0, search)
            setStats(data)
        } catch (error) {
            console.error(error)
            toast.error('Failed to load stats')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        loadStats()
    }, []) // eslint-disable-line react-hooks/exhaustive-deps

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault()
        loadStats()
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold">Статистика пользователей</h1>
                <p className="text-muted-foreground">Обзор активности пользователей: агенты и диалоги.</p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Поиск</CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSearch} className="flex gap-4">
                        <Input
                            placeholder="Email или имя..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="max-w-md"
                        />
                        <Button type="submit" disabled={loading}>
                            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
                            Найти
                        </Button>
                    </form>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Пользователи</CardTitle>
                    <CardDescription>Всего пользователей: {stats.length} (показано топ-50)</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Пользователь</TableHead>
                                    <TableHead>Email</TableHead>
                                    <TableHead className="text-right">Агентов</TableHead>
                                    <TableHead className="text-right">Диалогов (всего)</TableHead>
                                    <TableHead>Дата регистрации</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="h-24 text-center">
                                            <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
                                        </TableCell>
                                    </TableRow>
                                ) : stats.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                                            Ничего не найдено
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    stats.map((user) => (
                                        <TableRow key={user.id}>
                                            <TableCell className="font-medium">{user.name || 'Без имени'}</TableCell>
                                            <TableCell>{user.email}</TableCell>
                                            <TableCell className="text-right font-bold">{user.agentsCount}</TableCell>
                                            <TableCell className="text-right font-bold">{user.dialogsCount}</TableCell>
                                            <TableCell className="text-muted-foreground text-sm">
                                                {format(new Date(user.createdAt), 'dd.MM.yyyy')}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}

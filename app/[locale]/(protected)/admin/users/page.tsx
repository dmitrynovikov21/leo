'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Search, RefreshCw, LogIn, Mail } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

import { getAdminUsers, setUserBlocked, type AdminUser } from '@/actions/admin-users'
import { impersonateUser } from '@/actions/impersonate'
import { Button, buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { AdjustPuDialog } from './components/adjust-pu-dialog'
import { ChangeEmailDialog } from './components/change-email-dialog'
import { cn } from '@/lib/utils'

function statusBadge(user: AdminUser) {
  if (user.isBlocked) return <Badge variant="destructive">Заблокирован</Badge>
  if (user.puBalance <= 0 && user.puLimit > 0) return <Badge variant="outline">Исчерпан</Badge>
  return <Badge variant="secondary">Активен</Badge>
}

export default function AdminUsersPage() {
  const router = useRouter()
  const [users, setUsers] = useState<AdminUser[]>([])
  const [total, setTotal] = useState(0)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [adjustUser, setAdjustUser] = useState<AdminUser | null>(null)
  const [emailUser, setEmailUser] = useState<AdminUser | null>(null)

  const load = useCallback(async (q?: string) => {
    setLoading(true)
    try {
      const res = await getAdminUsers({ search: q, limit: 50 })
      setUsers(res.users)
      setTotal(res.total)
    } catch {
      toast.error('Не удалось загрузить пользователей')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    load(search.trim() || undefined)
  }

  const handleBlock = async (user: AdminUser) => {
    try {
      await setUserBlocked(user.id, !user.isBlocked)
      toast.success(user.isBlocked ? 'Пользователь разблокирован' : 'Пользователь заблокирован')
      load(search.trim() || undefined)
    } catch {
      toast.error('Ошибка')
    }
  }

  const handleImpersonate = async (user: AdminUser) => {
    try {
      await impersonateUser(user.id)
      toast.success(`Вход как ${user.email}`)
      router.push('/dashboard')
      router.refresh()
    } catch {
      toast.error('Не удалось войти как пользователь')
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Пользователи</h1>
          <p className="text-sm text-muted-foreground">Всего: {total}</p>
        </div>
      </div>

      <Card>
        <CardContent className="pt-4">
          <form onSubmit={handleSearch} className="flex gap-2">
            <Input
              placeholder="Поиск по email или имени..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="max-w-xs"
            />
            <Button type="submit" size="sm" variant="outline">
              <Search className="size-4" />
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => { setSearch(''); load() }}
            >
              <RefreshCw className="size-4" />
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Список пользователей</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Загрузка...</p>
          ) : users.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Не найдено</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email / Имя</TableHead>
                    <TableHead>Статус</TableHead>
                    <TableHead>Подписка</TableHead>
                    <TableHead className="text-right">PU баланс</TableHead>
                    <TableHead className="text-right">Использовано</TableHead>
                    <TableHead className="text-right">Всего PU</TableHead>
                    <TableHead className="text-right">USD</TableHead>
                    <TableHead>Агенты</TableHead>
                    <TableHead>Последняя активность</TableHead>
                    <TableHead>Действия</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map(user => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div className="font-medium text-sm max-w-[200px] truncate">{user.email || '—'}</div>
                        <div className="text-xs text-muted-foreground max-w-[200px] truncate">{user.name || user.id.slice(0, 8)}</div>
                      </TableCell>
                      <TableCell>{statusBadge(user)}</TableCell>
                      <TableCell>
                        <span className="text-xs">{user.plan?.code ?? '—'}</span>
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        {user.puBalance.toLocaleString('ru-RU', { maximumFractionDigits: 0 })}
                        <span className="text-muted-foreground">/{user.puLimit.toLocaleString('ru-RU', { maximumFractionDigits: 0 })}</span>
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        {user.puUsedThisCycle.toLocaleString('ru-RU', { maximumFractionDigits: 0 })}
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        {user.totalPuSpent.toLocaleString('ru-RU', { maximumFractionDigits: 0 })}
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        ${user.totalUsdSpent.toFixed(4)}
                      </TableCell>
                      <TableCell className="text-sm">
                        {user.agentsRunning > 0 ? (
                          <span className="text-green-600">{user.agentsRunning}/{user.agentsTotal} 🟢</span>
                        ) : (
                          <span>{user.agentsTotal}</span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {user.lastActivity
                          ? new Date(user.lastActivity).toLocaleDateString('ru-RU')
                          : '—'}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Link href={`/admin/users/${user.id}`} className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}>
                            Детали
                          </Link>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleImpersonate(user)}
                            title={`Войти как ${user.email}`}
                          >
                            <LogIn className="size-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setEmailUser(user)}
                            title="Изменить email"
                          >
                            <Mail className="size-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setAdjustUser(user)}
                          >
                            PU
                          </Button>
                          <Button
                            size="sm"
                            variant={user.isBlocked ? 'default' : 'destructive'}
                            onClick={() => handleBlock(user)}
                          >
                            {user.isBlocked ? 'Разблок' : 'Блок'}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {adjustUser && (
        <AdjustPuDialog
          open={!!adjustUser}
          onOpenChange={v => !v && setAdjustUser(null)}
          userId={adjustUser.id}
          userEmail={adjustUser.email}
          currentBalance={adjustUser.puBalance}
          onSuccess={() => load(search.trim() || undefined)}
        />
      )}

      {emailUser && (
        <ChangeEmailDialog
          open={!!emailUser}
          onOpenChange={v => !v && setEmailUser(null)}
          userId={emailUser.id}
          currentEmail={emailUser.email}
          onSuccess={() => load(search.trim() || undefined)}
        />
      )}
    </div>
  )
}

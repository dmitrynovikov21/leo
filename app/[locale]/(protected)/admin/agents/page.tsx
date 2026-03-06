'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Search, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'

import { getAdminAgents, type AdminAgent } from '@/actions/admin-agents'
import { Button, buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'

const STATUS_VARIANTS: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  RUNNING: 'default',
  STARTING: 'secondary',
  STOPPED: 'outline',
  ERROR: 'destructive',
}

export default function AdminAgentsPage() {
  const [agents, setAgents] = useState<AdminAgent[]>([])
  const [total, setTotal] = useState(0)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [loading, setLoading] = useState(true)

  const load = useCallback(async (q?: string, status?: string) => {
    setLoading(true)
    try {
      const res = await getAdminAgents({ search: q, status: status || undefined, limit: 50 })
      setAgents(res.agents)
      setTotal(res.total)
    } catch {
      toast.error('Не удалось загрузить агентов')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    load(search.trim() || undefined, statusFilter || undefined)
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Агенты</h1>
        <p className="text-sm text-muted-foreground">Всего: {total}</p>
      </div>

      <Card>
        <CardContent className="pt-4">
          <form onSubmit={handleSearch} className="flex gap-2 flex-wrap">
            <Input
              placeholder="Поиск по имени или email владельца..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="max-w-xs"
            />
            <Select value={statusFilter} onValueChange={v => { setStatusFilter(v === 'all' ? '' : v); load(search.trim() || undefined, v === 'all' ? undefined : v) }}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder="Статус" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все статусы</SelectItem>
                <SelectItem value="RUNNING">RUNNING</SelectItem>
                <SelectItem value="STOPPED">STOPPED</SelectItem>
                <SelectItem value="STARTING">STARTING</SelectItem>
                <SelectItem value="ERROR">ERROR</SelectItem>
              </SelectContent>
            </Select>
            <Button type="submit" size="sm" variant="outline">
              <Search className="size-4" />
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => { setSearch(''); setStatusFilter(''); load() }}>
              <RefreshCw className="size-4" />
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Все агенты</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Загрузка...</p>
          ) : agents.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Не найдено</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Агент</TableHead>
                    <TableHead>Статус</TableHead>
                    <TableHead>Роль</TableHead>
                    <TableHead>Владелец</TableHead>
                    <TableHead className="text-right">Польз.</TableHead>
                    <TableHead className="text-right">Диал. сег.</TableHead>
                    <TableHead className="text-right">Документы</TableHead>
                    <TableHead className="text-right">Конфл.</TableHead>
                    <TableHead>Создан</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {agents.map(agent => (
                    <TableRow key={agent.id}>
                      <TableCell>
                        <div className="font-medium text-sm">
                          {agent.emoji} {agent.name}
                        </div>
                        <div className="text-xs text-muted-foreground font-mono">{agent.id.slice(0, 8)}</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={STATUS_VARIANTS[agent.status] ?? 'outline'}>
                          {agent.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs">{agent.role}</TableCell>
                      <TableCell className="text-xs">
                        {agent.ownerEmail || agent.ownerName || agent.userId.slice(0, 8)}
                      </TableCell>
                      <TableCell className="text-right text-sm">{agent.uniqueUsers}</TableCell>
                      <TableCell className="text-right text-sm">{agent.dialogsToday}</TableCell>
                      <TableCell className="text-right text-sm">{agent.docsCount}</TableCell>
                      <TableCell className="text-right text-sm">
                        {agent.conflictsCount > 0 ? (
                          <span className="text-orange-500">{agent.conflictsCount}</span>
                        ) : 0}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(agent.createdAt).toLocaleDateString('ru-RU')}
                      </TableCell>
                      <TableCell>
                        <Link href={`/admin/agents/${agent.id}`} className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}>
                          Открыть
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

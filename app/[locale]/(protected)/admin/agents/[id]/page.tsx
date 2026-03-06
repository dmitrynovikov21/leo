import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Clock, DollarSign, MessageSquare, Zap } from 'lucide-react'

import { getCurrentUser } from '@/lib/session'
import { getAdminAgentDetail } from '@/actions/admin-agents'
import { Button, buttonVariants } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { DialogsView } from './components/dialogs-view'
import { cn } from '@/lib/utils'

interface Props {
  params: { id: string }
}

const STATUS_VARIANTS: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  RUNNING: 'default',
  STARTING: 'secondary',
  STOPPED: 'outline',
  ERROR: 'destructive',
}

export default async function AdminAgentDetailPage({ params }: Props) {
  const currentUser = await getCurrentUser()
  if (!currentUser || currentUser.role !== 'ADMIN') redirect('/login')

  let data
  try {
    data = await getAdminAgentDetail(params.id)
  } catch {
    notFound()
  }

  const { agent, conflicts, dialogs, tokenStats } = data

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/agents" className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }))}>
          <ArrowLeft className="size-4 mr-1" />
          Назад
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-bold">
              {agent.avatarEmoji} {agent.displayName || agent.name}
            </h1>
            <Badge variant={STATUS_VARIANTS[agent.status] ?? 'outline'}>{agent.status}</Badge>
            <span className="text-sm text-muted-foreground">{agent.role}</span>
          </div>
          <div className="flex gap-4 text-sm text-muted-foreground mt-1">
            <span>Владелец: {agent.user.email || agent.userId}</span>
            {agent.containerId && <span className="font-mono">Container: {agent.containerId.slice(0, 12)}</span>}
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="flex gap-2 text-sm font-medium"><MessageSquare className="size-4" />Запросов</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{tokenStats.requests.toLocaleString('ru-RU')}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="flex gap-2 text-sm font-medium"><Zap className="size-4" />Токены</CardTitle></CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{((tokenStats.promptTokens + tokenStats.completionTokens) / 1000).toFixed(1)}K</div>
            <p className="text-xs text-muted-foreground">{tokenStats.platformTokensCharged.toFixed(0)} PU</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="flex gap-2 text-sm font-medium"><DollarSign className="size-4" />Стоимость</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">${tokenStats.realCostUsd.toFixed(4)}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="flex gap-2 text-sm font-medium"><Clock className="size-4" />Ср. время</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{tokenStats.avgResponseMs}ms</div></CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader><CardTitle className="text-sm font-medium">Настройки поведения</CardTitle></CardHeader>
          <CardContent className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Temperature</span>
              <span>{agent.temperature}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Debounce</span>
              <span>{agent.debounceMs}ms</span>
            </div>
            {agent.tone.length > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tone</span>
                <span className="text-right">{agent.tone.join(', ')}</span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-sm font-medium">Версии промптов</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-1.5">
              {agent.promptVersions.length === 0 ? (
                <p className="text-sm text-muted-foreground">Нет версий</p>
              ) : (
                agent.promptVersions.map(v => (
                  <div key={v.id} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span>{v.version}</span>
                      {v.isActive && <Badge variant="default" className="text-xs">Активный</Badge>}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {new Date(v.createdAt).toLocaleDateString('ru-RU')}
                    </span>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-sm font-medium">Конфликты ({conflicts.length})</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-1.5 max-h-40 overflow-y-auto">
              {conflicts.length === 0 ? (
                <p className="text-sm text-muted-foreground">Нет конфликтов</p>
              ) : (
                conflicts.map(c => (
                  <div key={c.id} className="text-sm">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate">{c.topic}</span>
                      <Badge variant={c.status === 'NEW' ? 'destructive' : 'secondary'} className="text-xs shrink-0">
                        {c.status}
                      </Badge>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {new Date(c.detectedAt).toLocaleDateString('ru-RU')}
                    </span>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-sm font-medium">База знаний ({agent.knowledgeBases.length})</CardTitle></CardHeader>
        <CardContent>
          {agent.knowledgeBases.length === 0 ? (
            <p className="text-sm text-muted-foreground">Нет документов</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Файл</TableHead>
                  <TableHead>Тип</TableHead>
                  <TableHead className="text-right">Размер</TableHead>
                  <TableHead className="text-right">Чанки</TableHead>
                  <TableHead>Статус</TableHead>
                  <TableHead>Загружен</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {agent.knowledgeBases.map(kb => (
                  <TableRow key={kb.id}>
                    <TableCell className="text-sm font-medium">{kb.filename}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{kb.mimeType}</TableCell>
                    <TableCell className="text-right text-sm">{(kb.fileSize / 1024).toFixed(0)} KB</TableCell>
                    <TableCell className="text-right text-sm">{kb._count.chunks}</TableCell>
                    <TableCell>
                      <Badge variant={kb.status === 'VECTORIZED' ? 'default' : kb.status === 'ERROR' ? 'destructive' : 'secondary'} className="text-xs">
                        {kb.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(kb.createdAt).toLocaleDateString('ru-RU')}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <div>
        <h2 className="text-lg font-semibold mb-4">Диалоги</h2>
        <DialogsView agentId={agent.id} dialogs={dialogs} />
      </div>
    </div>
  )
}

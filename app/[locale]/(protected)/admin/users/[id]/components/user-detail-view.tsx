'use client'

import Link from 'next/link'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import type { AdminUserDetail } from '@/actions/admin-users'

const PU_TRANSACTION_LABELS: Record<string, string> = {
  SUBSCRIPTION_GRANT: 'Подписка',
  OVERAGE_DEDUCTION: 'Списание',
  PACK_TOPUP: 'Пакет',
  ADMIN_ADJUSTMENT: 'Корректировка',
  REFUND: 'Возврат',
  RESET: 'Сброс',
}

interface Props {
  data: AdminUserDetail
}

export function UserDetailView({ data }: Props) {
  const { user, tokenChart, documents, recentDialogs } = data
  const sub = user.subscription

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader><CardTitle className="text-sm font-medium">Подписка</CardTitle></CardHeader>
          <CardContent className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">План</span>
              <span>{sub?.plan?.name ?? '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Баланс PU</span>
              <span>{sub ? sub.puBalance.toLocaleString('ru-RU', { maximumFractionDigits: 0 }) : '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Лимит</span>
              <span>{sub ? sub.puLimit.toLocaleString('ru-RU', { maximumFractionDigits: 0 }) : '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Использовано</span>
              <span>{sub ? sub.puUsedThisCycle.toLocaleString('ru-RU', { maximumFractionDigits: 0 }) : '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Статус</span>
              <Badge variant={sub?.isBlocked ? 'destructive' : 'secondary'}>
                {sub?.isBlocked ? 'Заблокирован' : sub?.status ?? '—'}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-sm font-medium">Агенты ({user.agents.length})</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {user.agents.length === 0 ? (
                <p className="text-sm text-muted-foreground">Нет агентов</p>
              ) : (
                user.agents.map(agent => (
                  <div key={agent.id} className="flex items-center justify-between">
                    <Link href={`/admin/agents/${agent.id}`} className="text-sm hover:underline">
                      {agent.avatarEmoji} {agent.displayName || agent.name}
                    </Link>
                    <Badge variant={agent.status === 'RUNNING' ? 'default' : agent.status === 'ERROR' ? 'destructive' : 'secondary'} className="text-xs">
                      {agent.status}
                    </Badge>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-sm font-medium">Документы ({documents.length})</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-1.5 max-h-40 overflow-y-auto">
              {documents.length === 0 ? (
                <p className="text-sm text-muted-foreground">Нет документов</p>
              ) : (
                documents.map(doc => (
                  <div key={doc.id} className="text-xs">
                    <span className="font-medium truncate block">{doc.filename}</span>
                    <span className="text-muted-foreground">
                      {(doc.fileSize / 1024).toFixed(0)} KB · {doc.status}
                    </span>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {tokenChart.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-sm font-medium">Использование токенов (30д)</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={tokenChart}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="prompt" stroke="#6366f1" strokeWidth={2} name="Промпт" />
                <Line type="monotone" dataKey="completion" stroke="#22c55e" strokeWidth={2} name="Ответ" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-sm font-medium">Последние диалоги</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {recentDialogs.length === 0 ? (
                <p className="text-sm text-muted-foreground">Нет диалогов</p>
              ) : (
                recentDialogs.map(d => (
                  <div key={`${d.agentId}-${d.telegramUserId}`} className="border-b border-border pb-2 last:border-0">
                    <div className="flex justify-between text-xs text-muted-foreground mb-1">
                      <Link href={`/admin/agents/${d.agentId}`} className="hover:underline">
                        Агент: {d.agentId.slice(0, 8)}
                      </Link>
                      <span>TG: {d.telegramUserId}</span>
                    </div>
                    <p className="text-sm truncate">{d.lastMessage || '—'}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(d.lastTime).toLocaleString('ru-RU')} · {d.messageCount} сообщ.
                    </p>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-sm font-medium">PU транзакции (последние 50)</CardTitle></CardHeader>
          <CardContent className="p-0">
            <div className="max-h-72 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Тип</TableHead>
                    <TableHead className="text-right">Сумма</TableHead>
                    <TableHead className="text-right">Баланс</TableHead>
                    <TableHead>Дата</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {user.puTransactions.map(t => (
                    <TableRow key={t.id}>
                      <TableCell className="text-xs">
                        {PU_TRANSACTION_LABELS[t.type] ?? t.type}
                        {t.description && (
                          <div className="text-muted-foreground truncate max-w-32">{t.description}</div>
                        )}
                      </TableCell>
                      <TableCell className={`text-right text-sm font-medium ${t.puAmount >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                        {t.puAmount >= 0 ? '+' : ''}{t.puAmount.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right text-xs text-muted-foreground">
                        {t.balanceAfter.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(t.createdAt).toLocaleDateString('ru-RU')}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

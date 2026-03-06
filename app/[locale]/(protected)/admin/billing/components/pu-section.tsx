'use client'

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

import { getBillingPuStats, getPuTransactions, type Period } from '@/actions/admin-billing'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

const TX_LABELS: Record<string, string> = {
  SUBSCRIPTION_GRANT: 'Подписка',
  OVERAGE_DEDUCTION: 'Списание',
  PACK_TOPUP: 'Пакет',
  ADMIN_ADJUSTMENT: 'Корректировка',
  REFUND: 'Возврат',
  RESET: 'Сброс',
}

interface Props {
  period: Period
}

export function PuSection({ period }: Props) {
  const [stats, setStats] = useState<Awaited<ReturnType<typeof getBillingPuStats>> | null>(null)
  const [txData, setTxData] = useState<Awaited<ReturnType<typeof getPuTransactions>> | null>(null)
  const [txType, setTxType] = useState<string>('')
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [s, tx] = await Promise.all([
        getBillingPuStats(period),
        getPuTransactions({ limit: 50, type: txType || undefined }),
      ])
      setStats(s)
      setTxData(tx)
    } catch {
      toast.error('Ошибка загрузки данных PU')
    } finally {
      setLoading(false)
    }
  }, [period, txType])

  useEffect(() => { load() }, [load])

  if (loading || !stats || !txData) {
    return <p className="text-sm text-muted-foreground">Загрузка...</p>
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Общий баланс PU</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{stats.totalBalance.toLocaleString('ru-RU', { maximumFractionDigits: 0 })}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Потрачено за период</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{stats.puSpent.toLocaleString('ru-RU', { maximumFractionDigits: 0 })}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Топ пользователей</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-1">
              {stats.topUsers.slice(0, 5).map(u => (
                <div key={u.user_id} className="flex justify-between text-xs">
                  <span className="truncate text-muted-foreground">{u.email || u.user_id.slice(0, 8)}</span>
                  <span className="font-medium">{u.total.toFixed(0)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {stats.chartData.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-sm font-medium">Расход PU по дням</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={stats.chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="spent" fill="#6366f1" name="PU" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-medium">Транзакции PU ({txData.total})</CardTitle>
          <Select value={txType || 'all'} onValueChange={v => setTxType(v === 'all' ? '' : v)}>
            <SelectTrigger className="w-40 h-8 text-xs">
              <SelectValue placeholder="Тип" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все типы</SelectItem>
              {Object.entries(TX_LABELS).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent className="p-0">
          <div className="max-h-80 overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Пользователь</TableHead>
                  <TableHead>Тип</TableHead>
                  <TableHead className="text-right">Сумма PU</TableHead>
                  <TableHead className="text-right">Баланс</TableHead>
                  <TableHead>Дата</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {txData.transactions.map(t => (
                  <TableRow key={t.id}>
                    <TableCell className="text-xs">{t.user.email || t.userId.slice(0, 8)}</TableCell>
                    <TableCell>
                      <Badge variant={t.type === 'OVERAGE_DEDUCTION' ? 'destructive' : 'secondary'} className="text-xs">
                        {TX_LABELS[t.type] ?? t.type}
                      </Badge>
                    </TableCell>
                    <TableCell className={`text-right text-sm font-medium ${t.puAmount >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                      {t.puAmount >= 0 ? '+' : ''}{t.puAmount.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right text-xs text-muted-foreground">
                      {t.balanceAfter.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(t.createdAt).toLocaleString('ru-RU')}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

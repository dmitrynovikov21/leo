'use client'

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

import { getUsdStats, getFilesStats, type Period } from '@/actions/admin-billing'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

const REQUEST_TYPE_LABELS: Record<string, string> = {
  AGENT_CHAT: 'Чат агента',
  INSTRUCTION_GEN: 'Генерация инструкций',
  TEST_GEN: 'Генерация тестов',
  SUMMARIZATION: 'Суммаризация',
  CONFLICT_CHECK: 'Проверка конфликтов',
  RAG_QUERY: 'RAG запрос',
  MANUAL_TEST: 'Ручной тест',
  OTHER: 'Прочее',
}

interface Props {
  period: Period
}

export function UsdSection({ period }: Props) {
  const [usd, setUsd] = useState<Awaited<ReturnType<typeof getUsdStats>> | null>(null)
  const [files, setFiles] = useState<Awaited<ReturnType<typeof getFilesStats>> | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [u, f] = await Promise.all([getUsdStats(period), getFilesStats()])
      setUsd(u)
      setFiles(f)
    } catch {
      toast.error('Ошибка загрузки')
    } finally {
      setLoading(false)
    }
  }, [period])

  useEffect(() => { load() }, [load])

  if (loading || !usd || !files) {
    return <p className="text-sm text-muted-foreground">Загрузка...</p>
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Всего затрат USD</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">${usd.totalCostUsd.toFixed(4)}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Файлов в базах знаний</CardTitle></CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{files.totalFiles.toLocaleString('ru-RU')}</div>
            <p className="text-xs text-muted-foreground">{(files.totalSize / 1024 / 1024).toFixed(1)} MB</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Дедупликация</CardTitle></CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{files.dedupCount}</div>
            <p className="text-xs text-muted-foreground">файлов сэкономлено</p>
          </CardContent>
        </Card>
      </div>

      {usd.chartData.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-sm font-medium">Расходы USD по дням</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={usd.chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis tickFormatter={v => `$${v.toFixed(4)}`} />
                <Tooltip formatter={(v: number) => `$${v.toFixed(6)}`} />
                <Line type="monotone" dataKey="cost" stroke="#ef4444" strokeWidth={2} name="USD" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-sm font-medium">По моделям</CardTitle></CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Модель</TableHead>
                  <TableHead className="text-right">Запросов</TableHead>
                  <TableHead className="text-right">USD</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {usd.byModel.map(m => (
                  <TableRow key={m.model}>
                    <TableCell className="text-sm font-medium">{m.model}</TableCell>
                    <TableCell className="text-right text-sm">{m.requests.toLocaleString('ru-RU')}</TableCell>
                    <TableCell className="text-right text-sm">${m.costUsd.toFixed(6)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-sm font-medium">По типам запросов</CardTitle></CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Тип</TableHead>
                  <TableHead className="text-right">Запросов</TableHead>
                  <TableHead className="text-right">USD</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {usd.byRequestType.map(r => (
                  <TableRow key={r.requestType}>
                    <TableCell className="text-sm">{REQUEST_TYPE_LABELS[r.requestType] ?? r.requestType}</TableCell>
                    <TableCell className="text-right text-sm">{r.requests.toLocaleString('ru-RU')}</TableCell>
                    <TableCell className="text-right text-sm">${r.costUsd.toFixed(6)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

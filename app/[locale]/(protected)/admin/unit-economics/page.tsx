'use client'

import { useState, useEffect } from 'react'
import { getUnitEconomics, exportUnitEconomicsCSV } from '@/actions/unit-economics'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Download, TrendingUp, TrendingDown, DollarSign, Zap } from 'lucide-react'
import { toast } from 'sonner'

interface UnitEconomicsData {
  period: {
    from: string | Date
    to: string | Date
  }
  metrics: {
    totalTokensFromTopups: number
    estimatedRevenueRub: number
    estimatedRevenueUsd: number
    totalTokensUsedLlm: number
    totalTokensUsedPlatform: number
    totalCostUsd: number
    marginUsd: number
    marginPercent: number
    totalRequests: number
  }
  byModel: Array<{
    model: string
    requests: number
    totalTokens: number
    platformTokens: number
    costUsd: number
    percentOfTotal: number
  }>
  chartData: Array<{
    date: string
    revenue: number
    costs: number
    tokensCost: number
  }>
}

export default function UnitEconomicsPage() {
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [data, setData] = useState<UnitEconomicsData | null>(null)
  const [loading, setLoading] = useState(false)
  const [exporting, setExporting] = useState(false)

  // Set default date range (last 30 days)
  useEffect(() => {
    const now = new Date()
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

    const formatDate = (d: Date) => d.toISOString().split('T')[0]

    setDateFrom(formatDate(thirtyDaysAgo))
    setDateTo(formatDate(now))
  }, [])

  const handleLoadData = async () => {
    if (!dateFrom || !dateTo) {
      toast.error('Пожалуйста, выберите обе даты')
      return
    }

    setLoading(true)

    try {
      const result = await getUnitEconomics({
        dateFrom: new Date(dateFrom),
        dateTo: new Date(dateTo),
      })
      setData(result)
      toast.success('Данные успешно загружены')
    } catch (error) {
      console.error('Error loading unit economics:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  const handleExport = async () => {
    if (!data) {
      toast.error('Нет данных для экспорта')
      return
    }

    setExporting(true)

    try {
      const result = await exportUnitEconomicsCSV({
        dateFrom: new Date(dateFrom),
        dateTo: new Date(dateTo),
      })

      // Create blob and download
      const blob = new Blob([result.content], { type: 'text/csv' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = result.filename
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      toast.success('CSV успешно экспортирован')
    } catch (error) {
      console.error('Error exporting:', error)
      toast.error('Не удалось экспортировать CSV')
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className='space-y-6'>
      <div>
        <h1 className='text-3xl font-bold'>Юнит-экономика</h1>
        <p className='text-muted-foreground'>Анализ выручки и затрат, разбор по моделям</p>
      </div>

      {/* Date Range Selector */}
      <Card>
        <CardHeader>
          <CardTitle>Выберите период</CardTitle>
        </CardHeader>
        <CardContent>
          <div className='flex flex-col gap-4 md:flex-row md:items-end'>
            <div className='flex-1 space-y-2'>
              <Label htmlFor='dateFrom'>От</Label>
              <Input
                id='dateFrom'
                type='date'
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                disabled={loading}
              />
            </div>
            <div className='flex-1 space-y-2'>
              <Label htmlFor='dateTo'>До</Label>
              <Input
                id='dateTo'
                type='date'
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                disabled={loading}
              />
            </div>
            <div className='flex gap-2'>
              <Button onClick={handleLoadData} disabled={loading}>
                {loading ? 'Загрузка...' : 'Загрузить данные'}
              </Button>
              <Button variant='outline' onClick={handleExport} disabled={!data || exporting}>
                <Download className='mr-2 h-4 w-4' />
                {exporting ? 'Экспорт...' : 'Скачать CSV'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {data && (
        <>
          {/* Key Metrics */}
          <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-4'>
            <Card>
              <CardHeader className='pb-2'>
                <CardTitle className='flex items-center gap-2 text-sm font-medium'>
                  <DollarSign className='h-4 w-4' />
                  Выручка (РУБ)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className='text-2xl font-bold'>{data.metrics.estimatedRevenueRub.toFixed(2)} ₽</div>
                <p className='text-xs text-muted-foreground'>
                  ~${data.metrics.estimatedRevenueUsd.toFixed(2)} USD
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className='pb-2'>
                <CardTitle className='flex items-center gap-2 text-sm font-medium'>
                  <TrendingDown className='h-4 w-4' />
                  Затраты (USD)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className='text-2xl font-bold'>${data.metrics.totalCostUsd.toFixed(6)}</div>
                <p className='text-xs text-muted-foreground'>{data.metrics.totalRequests} запросов</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className='pb-2'>
                <CardTitle className='flex items-center gap-2 text-sm font-medium'>
                  <TrendingUp className='h-4 w-4' />
                  Маржа
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div
                  className={`text-2xl font-bold ${data.metrics.marginUsd >= 0 ? 'text-green-600' : 'text-red-600'}`}
                >
                  ${data.metrics.marginUsd.toFixed(6)}
                </div>
                <p className='text-xs text-muted-foreground'>{data.metrics.marginPercent.toFixed(2)}% маржа</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className='pb-2'>
                <CardTitle className='flex items-center gap-2 text-sm font-medium'>
                  <Zap className='h-4 w-4' />
                  LLM Токены
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className='text-2xl font-bold'>{(data.metrics.totalTokensUsedLlm / 1000).toFixed(1)}K</div>
                <p className='text-xs text-muted-foreground'>
                  {data.metrics.totalTokensUsedPlatform.toFixed(0)} платформенных токенов
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Chart */}
          {data.chartData.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Выручка vs Затраты по дням</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width='100%' height={300}>
                  <LineChart data={data.chartData}>
                    <CartesianGrid strokeDasharray='3 3' />
                    <XAxis dataKey='date' />
                    <YAxis />
                    <Tooltip formatter={(value) => `$${Number(value).toFixed(2)}`} />
                    <Legend />
                    <Line
                      type='monotone'
                      dataKey='revenue'
                      stroke='#22c55e'
                      name='Выручка (RUB → USD)'
                      strokeWidth={2}
                    />
                    <Line type='monotone' dataKey='costs' stroke='#ef4444' name='Затраты (USD)' strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* By Model Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle>Разбор по моделям</CardTitle>
              <CardDescription>Использование токенов и затраты по каждой модели</CardDescription>
            </CardHeader>
            <CardContent>
              <div className='rounded-lg border'>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Модель</TableHead>
                      <TableHead className='text-right'>Запросы</TableHead>
                      <TableHead className='text-right'>Всего токенов</TableHead>
                      <TableHead className='text-right'>Стоимость (USD)</TableHead>
                      <TableHead className='text-right'>% от общего</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.byModel.map((model) => (
                      <TableRow key={model.model}>
                        <TableCell className='font-medium'>{model.model}</TableCell>
                        <TableCell className='text-right'>{model.requests}</TableCell>
                        <TableCell className='text-right'>{model.totalTokens.toLocaleString('ru-RU')}</TableCell>
                        <TableCell className='text-right'>${model.costUsd.toFixed(6)}</TableCell>
                        <TableCell className='text-right'>{model.percentOfTotal.toFixed(2)}%</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {!data && !loading && (
        <Card>
          <CardContent className='py-8 text-center text-muted-foreground'>
            Выберите диапазон дат и нажмите "Загрузить данные" для просмотра юнит-экономики
          </CardContent>
        </Card>
      )}
    </div>
  )
}

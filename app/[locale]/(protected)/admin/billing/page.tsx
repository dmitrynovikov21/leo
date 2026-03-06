'use client'

import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { Period } from '@/actions/admin-billing'
import { PuSection } from './components/pu-section'
import { UsdSection } from './components/usd-section'

const PERIOD_LABELS: Record<Period, string> = {
  today: 'Сегодня',
  '7d': '7 дней',
  '30d': '30 дней',
}

export default function AdminBillingPage() {
  const [period, setPeriod] = useState<Period>('30d')

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Биллинг и финансы</h1>
          <p className="text-sm text-muted-foreground">PU транзакции и реальные затраты на LLM</p>
        </div>
        <Select value={period} onValueChange={v => setPeriod(v as Period)}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(Object.entries(PERIOD_LABELS) as [Period, string][]).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Tabs defaultValue="pu">
        <TabsList>
          <TabsTrigger value="pu">PU</TabsTrigger>
          <TabsTrigger value="usd">USD / Файлы</TabsTrigger>
        </TabsList>
        <TabsContent value="pu" className="mt-4">
          <PuSection period={period} />
        </TabsContent>
        <TabsContent value="usd" className="mt-4">
          <UsdSection period={period} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

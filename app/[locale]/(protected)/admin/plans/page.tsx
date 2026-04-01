'use client'

import { useEffect, useState } from 'react'
import { getPlansWithStats, upsertPlan, deletePlan } from '@/actions/admin-plans'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'

interface Plan {
  id: string
  code: string
  name: string
  monthlyPuLimit: number
  priceMonthlyRub: number
  overagePuPriceRub: number
  overageDialogPriceRub: number
  features: string[]
  isActive: boolean
  displayOrder: number
  stripePriceId: string | null
  usersCount: number
}

const emptyForm = {
  id: '',
  code: '',
  name: '',
  monthlyPuLimit: 0,
  priceMonthlyRub: 0,
  overagePuPriceRub: 0,
  overageDialogPriceRub: 0,
  features: [] as string[],
  isActive: true,
  displayOrder: 0,
}

export default function AdminPlansPage() {
  const [plans, setPlans] = useState<Plan[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editing, setEditing] = useState<typeof emptyForm | null>(null)
  const [featuresText, setFeaturesText] = useState('')
  const [error, setError] = useState('')

  const loadPlans = async () => {
    try {
      const data = await getPlansWithStats()
      setPlans(data)
    } catch (err) {
      console.error('Error loading plans:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadPlans()
  }, [])

  const handleEdit = (plan: Plan) => {
    setEditing({
      id: plan.id,
      code: plan.code,
      name: plan.name,
      monthlyPuLimit: plan.monthlyPuLimit,
      priceMonthlyRub: plan.priceMonthlyRub,
      overagePuPriceRub: plan.overagePuPriceRub,
      overageDialogPriceRub: plan.overageDialogPriceRub,
      features: plan.features,
      isActive: plan.isActive,
      displayOrder: plan.displayOrder,
    })
    setFeaturesText(plan.features.join('\n'))
    setError('')
  }

  const handleNew = () => {
    setEditing({ ...emptyForm, displayOrder: plans.length })
    setFeaturesText('')
    setError('')
  }

  const handleSave = async () => {
    if (!editing) return
    if (!editing.code.trim() || !editing.name.trim()) {
      setError('Код и название обязательны')
      return
    }

    setSaving(true)
    setError('')
    try {
      const result = await upsertPlan({
        ...(editing.id ? { id: editing.id } : {}),
        code: editing.code.trim().toUpperCase(),
        name: editing.name.trim(),
        monthlyPuLimit: editing.monthlyPuLimit,
        priceMonthlyRub: editing.priceMonthlyRub,
        overagePuPriceRub: editing.overagePuPriceRub,
        overageDialogPriceRub: editing.overageDialogPriceRub,
        features: featuresText.split('\n').map(s => s.trim()).filter(Boolean),
        isActive: editing.isActive,
        displayOrder: editing.displayOrder,
      })
      if (result.success) {
        setEditing(null)
        await loadPlans()
      }
    } catch (err: any) {
      setError(err.message || 'Ошибка сохранения')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (plan: Plan) => {
    if (!confirm(`Удалить тариф "${plan.name}"?`)) return
    const result = await deletePlan(plan.id)
    if (result.success) {
      await loadPlans()
    } else {
      alert(result.error)
    }
  }

  if (loading) {
    return <div className="p-6">Загрузка...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Тарифные планы</h1>
          <p className="text-muted-foreground">Управление подписками и ценами</p>
        </div>
        <Button onClick={handleNew}>Новый тариф</Button>
      </div>

      {/* Edit/Create Form */}
      {editing && (
        <Card>
          <CardHeader>
            <CardTitle>{editing.id ? 'Редактировать тариф' : 'Новый тариф'}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Код (BASIC, PRO, ...)</Label>
                <Input
                  value={editing.code}
                  onChange={(e) => setEditing({ ...editing, code: e.target.value })}
                  placeholder="PRO"
                  disabled={!!editing.id}
                />
              </div>
              <div className="space-y-2">
                <Label>Название</Label>
                <Input
                  value={editing.name}
                  onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                  placeholder="Профессиональный"
                />
              </div>
              <div className="space-y-2">
                <Label>PU в месяц</Label>
                <Input
                  type="number"
                  value={editing.monthlyPuLimit}
                  onChange={(e) => setEditing({ ...editing, monthlyPuLimit: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label>Цена в месяц (руб)</Label>
                <Input
                  type="number"
                  value={editing.priceMonthlyRub}
                  onChange={(e) => setEditing({ ...editing, priceMonthlyRub: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label>Цена за доп. PU (руб)</Label>
                <Input
                  type="number"
                  value={editing.overagePuPriceRub}
                  onChange={(e) => setEditing({ ...editing, overagePuPriceRub: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label>Цена за доп. диалог (руб)</Label>
                <Input
                  type="number"
                  value={editing.overageDialogPriceRub}
                  onChange={(e) => setEditing({ ...editing, overageDialogPriceRub: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label>Порядок отображения</Label>
                <Input
                  type="number"
                  value={editing.displayOrder}
                  onChange={(e) => setEditing({ ...editing, displayOrder: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div className="flex items-center gap-3 pt-6">
                <Switch
                  checked={editing.isActive}
                  onCheckedChange={(v) => setEditing({ ...editing, isActive: v })}
                />
                <Label>Активен</Label>
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Фичи (по одной на строку)</Label>
                <Textarea
                  value={featuresText}
                  onChange={(e) => setFeaturesText(e.target.value)}
                  rows={4}
                  placeholder={"До 3 агентов\n500 PU в месяц\nПриоритетная поддержка"}
                />
              </div>
            </div>

            {error && <p className="text-red-500 text-sm mt-3">{error}</p>}

            <div className="flex gap-2 mt-4">
              <Button onClick={handleSave} disabled={saving}>
                {saving ? 'Сохранение...' : 'Сохранить'}
              </Button>
              <Button variant="outline" onClick={() => setEditing(null)}>
                Отмена
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Plans Table */}
      <Card>
        <CardHeader>
          <CardTitle>Все тарифы</CardTitle>
          <CardDescription>
            {plans.length} тарифов, {plans.filter(p => p.isActive).length} активных
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted border-b border-border">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold">Тариф</th>
                  <th className="text-right px-4 py-3 font-semibold">PU / мес</th>
                  <th className="text-right px-4 py-3 font-semibold">Цена / мес</th>
                  <th className="text-right px-4 py-3 font-semibold">Доп. PU</th>
                  <th className="text-right px-4 py-3 font-semibold">Доп. диалог</th>
                  <th className="text-center px-4 py-3 font-semibold">Пользователей</th>
                  <th className="text-center px-4 py-3 font-semibold">Статус</th>
                  <th className="text-right px-4 py-3 font-semibold">Действия</th>
                </tr>
              </thead>
              <tbody>
                {plans.map((plan) => (
                  <tr key={plan.id} className="border-b border-border hover:bg-muted/50">
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium">{plan.name}</p>
                        <p className="text-sm text-muted-foreground font-mono">{plan.code}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-mono">{plan.monthlyPuLimit}</td>
                    <td className="px-4 py-3 text-right font-mono">{plan.priceMonthlyRub} ₽</td>
                    <td className="px-4 py-3 text-right font-mono">{plan.overagePuPriceRub} ₽</td>
                    <td className="px-4 py-3 text-right font-mono">{plan.overageDialogPriceRub} ₽</td>
                    <td className="px-4 py-3 text-center">
                      <span className="bg-muted px-2 py-0.5 rounded text-sm font-mono">
                        {plan.usersCount}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        plan.isActive
                          ? 'bg-green-100 text-green-800 dark:bg-green-950/30 dark:text-green-400'
                          : 'bg-muted text-muted-foreground'
                      }`}>
                        {plan.isActive ? 'Активен' : 'Отключён'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex gap-1 justify-end">
                        <Button size="sm" variant="outline" onClick={() => handleEdit(plan)}>
                          Изменить
                        </Button>
                        {plan.usersCount === 0 && (
                          <Button size="sm" variant="destructive" onClick={() => handleDelete(plan)}>
                            Удалить
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {plans.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">
                      Нет тарифных планов. Создайте первый.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Revenue Summary */}
      {plans.some(p => p.usersCount > 0) && (
        <Card>
          <CardHeader>
            <CardTitle>Расчёт дохода</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-muted rounded-lg p-4">
                <p className="text-sm text-muted-foreground">Ежемесячный доход</p>
                <p className="text-2xl font-bold">
                  {plans.reduce((sum, p) => sum + p.priceMonthlyRub * p.usersCount, 0).toLocaleString('ru-RU')} ₽
                </p>
              </div>
              <div className="bg-muted rounded-lg p-4">
                <p className="text-sm text-muted-foreground">Всего подписчиков</p>
                <p className="text-2xl font-bold">
                  {plans.reduce((sum, p) => sum + p.usersCount, 0)}
                </p>
              </div>
              <div className="bg-muted rounded-lg p-4">
                <p className="text-sm text-muted-foreground">Средний чек</p>
                <p className="text-2xl font-bold">
                  {(() => {
                    const totalUsers = plans.reduce((sum, p) => sum + p.usersCount, 0)
                    const totalRevenue = plans.reduce((sum, p) => sum + p.priceMonthlyRub * p.usersCount, 0)
                    return totalUsers > 0 ? Math.round(totalRevenue / totalUsers).toLocaleString('ru-RU') : 0
                  })()} ₽
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

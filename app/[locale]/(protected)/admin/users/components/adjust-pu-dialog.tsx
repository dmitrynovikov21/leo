'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { adjustPuBalance } from '@/actions/admin-users'

interface Props {
  open: boolean
  onOpenChange: (v: boolean) => void
  userId: string
  userEmail: string | null
  currentBalance: number
  onSuccess: () => void
}

export function AdjustPuDialog({ open, onOpenChange, userId, userEmail, currentBalance, onSuccess }: Props) {
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const num = parseFloat(amount)
    if (isNaN(num) || num === 0) {
      toast.error('Введите корректную сумму')
      return
    }
    setLoading(true)
    try {
      await adjustPuBalance(userId, num, description || `Ручная корректировка от администратора`)
      toast.success(`PU баланс обновлён: ${num > 0 ? '+' : ''}${num}`)
      onSuccess()
      onOpenChange(false)
      setAmount('')
      setDescription('')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Ошибка')
    } finally {
      setLoading(false)
    }
  }

  const numAmount = parseFloat(amount) || 0
  const newBalance = currentBalance + numAmount

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Корректировка PU</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">{userEmail}</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <Label>Сумма (+ пополнение, − списание)</Label>
            <Input
              type="number"
              step="0.01"
              placeholder="например: 100 или -50"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              disabled={loading}
            />
            {amount && (
              <p className="text-xs text-muted-foreground">
                Текущий: {currentBalance.toFixed(2)} → Новый: {newBalance.toFixed(2)}
              </p>
            )}
          </div>
          <div className="space-y-1">
            <Label>Комментарий</Label>
            <Input
              placeholder="Причина корректировки"
              value={description}
              onChange={e => setDescription(e.target.value)}
              disabled={loading}
            />
          </div>
          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Отмена
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Применение...' : 'Применить'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

'use client'

import { useState } from 'react'
import { addBalanceAdmin } from '@/actions/balance'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'

interface User {
  id: string
  email: string | null
  name: string | null
  tokenBalance: number
}

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  user: User
  onSuccess: () => void
}

export default function TopupUserDialog({ open, onOpenChange, user, onSuccess }: Props) {
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!amount) {
      toast.error('Пожалуйста, введите сумму')
      return
    }

    const tokenAmount = parseFloat(amount)
    if (tokenAmount <= 0) {
      toast.error('Сумма должна быть больше 0')
      return
    }

    setLoading(true)

    try {
      await addBalanceAdmin({
        userId: user.id,
        amount: tokenAmount,
        description: description || `Ручное пополнение администратором`,
      })

      toast.success(`Добавлено ${tokenAmount} токенов для ${user.email || 'пользователя'}`)
      setAmount('')
      setDescription('')
      onOpenChange(false)
      onSuccess()
    } catch (error) {
      console.error('Error adding balance:', error)
      toast.error(error instanceof Error ? error.message : 'Не удалось добавить токены')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Пополнить баланс пользователя</DialogTitle>
          <DialogDescription>
            Добавить токены для {user.email || 'пользователя'} (Текущий баланс: {user.tokenBalance.toLocaleString('ru-RU')} токенов)
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className='space-y-4'>
          <div className='space-y-2'>
            <Label htmlFor='amount'>Количество токенов</Label>
            <Input
              id='amount'
              type='number'
              step='1'
              min='1'
              placeholder='напр., 100'
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              disabled={loading}
            />
          </div>

          <div className='space-y-2'>
            <Label htmlFor='description'>Описание (необязательно)</Label>
            <Textarea
              id='description'
              placeholder='напр., Акция, Компенсация за ошибку и т.п.'
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={loading}
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button type='button' variant='outline' onClick={() => onOpenChange(false)} disabled={loading}>
              Отмена
            </Button>
            <Button type='submit' disabled={loading}>
              {loading ? 'Добавление...' : 'Добавить токены'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

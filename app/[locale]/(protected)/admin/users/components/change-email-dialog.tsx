'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { changeUserEmail } from '@/actions/admin-users'

interface Props {
  open: boolean
  onOpenChange: (v: boolean) => void
  userId: string
  currentEmail: string | null
  onSuccess: () => void
}

export function ChangeEmailDialog({ open, onOpenChange, userId, currentEmail, onSuccess }: Props) {
  const [newEmail, setNewEmail] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = newEmail.trim()
    if (!trimmed || !trimmed.includes('@')) {
      toast.error('Введите корректный email')
      return
    }
    setLoading(true)
    try {
      await changeUserEmail(userId, trimmed)
      toast.success(`Email изменён на ${trimmed}`)
      onSuccess()
      onOpenChange(false)
      setNewEmail('')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Ошибка')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Изменить email</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">Текущий: {currentEmail || '—'}</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <Label>Новый email</Label>
            <Input
              type="email"
              placeholder="new@example.com"
              value={newEmail}
              onChange={e => setNewEmail(e.target.value)}
              disabled={loading}
              autoFocus
            />
          </div>
          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Отмена
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Сохранение...' : 'Сохранить'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

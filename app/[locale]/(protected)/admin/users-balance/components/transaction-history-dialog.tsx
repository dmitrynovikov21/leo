'use client'

import { useState, useEffect } from 'react'
import { getUserTransactionHistoryAdmin } from '@/actions/balance'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'

interface Transaction {
  id: string
  type: string
  amount: number
  balanceBefore: number
  balanceAfter: number
  description: string | null
  createdAt: Date
  createdBy: string | null
}

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
}

export default function TransactionHistoryDialog({ open, onOpenChange, user }: Props) {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (open) {
      loadTransactions()
    }
  }, [open])

  const loadTransactions = async () => {
    setLoading(true)

    try {
      const result = await getUserTransactionHistoryAdmin(user.id, 50)
      setTransactions(result.transactions)
    } catch (error) {
      console.error('Error loading transactions:', error)
      toast.error('Не удалось загрузить историю транзакций')
    } finally {
      setLoading(false)
    }
  }

  const getTypeColor = (type: string) => {
    const typeMap: Record<string, string> = {
      'TOPUP': 'bg-green-100 text-green-800 dark:bg-green-950/30 dark:text-green-400',
      'DEDUCTION': 'bg-red-100 text-red-800 dark:bg-red-950/30 dark:text-red-400',
      'ADJUSTMENT': 'bg-blue-100 text-blue-800 dark:bg-blue-950/30 dark:text-blue-400',
      'REFUND': 'bg-purple-100 text-purple-800 dark:bg-purple-950/30 dark:text-purple-400',
    }
    return typeMap[type] || 'bg-muted text-muted-foreground'
  }

  const getTypeLabel = (type: string) => {
    const typeMap: Record<string, string> = {
      'TOPUP': 'Пополнение',
      'DEDUCTION': 'Списание',
      'ADJUSTMENT': 'Корректировка',
      'REFUND': 'Возврат',
    }
    return typeMap[type] || type
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-w-4xl'>
        <DialogHeader>
          <DialogTitle>История транзакций</DialogTitle>
          <DialogDescription>Все транзакции для {user.email || 'пользователя'}</DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className='py-8 text-center text-muted-foreground'>Загрузка транзакций...</div>
        ) : transactions.length === 0 ? (
          <div className='py-8 text-center text-muted-foreground'>Транзакции не найдены</div>
        ) : (
          <div className='rounded-lg border'>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Тип</TableHead>
                  <TableHead className='text-right'>Сумма</TableHead>
                  <TableHead className='text-right'>До</TableHead>
                  <TableHead className='text-right'>После</TableHead>
                  <TableHead>Описание</TableHead>
                  <TableHead>Дата</TableHead>
                  <TableHead>Автор</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((tx) => (
                  <TableRow key={tx.id}>
                    <TableCell>
                      <Badge className={getTypeColor(tx.type)}>{getTypeLabel(tx.type)}</Badge>
                    </TableCell>
                    <TableCell className={`text-right font-medium ${tx.amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {tx.amount >= 0 ? '+' : ''}{tx.amount}
                    </TableCell>
                    <TableCell className='text-right text-sm text-muted-foreground'>
                      {tx.balanceBefore.toLocaleString('ru-RU')}
                    </TableCell>
                    <TableCell className='text-right text-sm text-muted-foreground'>
                      {tx.balanceAfter.toLocaleString('ru-RU')}
                    </TableCell>
                    <TableCell className='text-sm'>{tx.description || '—'}</TableCell>
                    <TableCell className='text-sm'>
                      {new Date(tx.createdAt).toLocaleDateString('ru-RU')}{' '}
                      {new Date(tx.createdAt).toLocaleTimeString('ru-RU')}
                    </TableCell>
                    <TableCell className='text-sm text-muted-foreground'>{tx.createdBy || '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

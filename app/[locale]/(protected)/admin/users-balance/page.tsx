'use client'

import { useState, useEffect } from 'react'
import { getAllUsersWithBalances, searchUsers, getUserTransactionHistoryAdmin } from '@/actions/balance'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Coins, Search } from 'lucide-react'
import { toast } from 'sonner'
import TopupUserDialog from './components/topup-user-dialog'
import TransactionHistoryDialog from './components/transaction-history-dialog'
import { UserSubscriptionSelect } from './components/user-subscription-select'

interface User {
  id: string
  email: string | null
  name: string | null
  tokenBalance: number
  createdAt: Date
  lastTransaction: Date | null
  lastTransactionType: string | null
  subscription?: {
    planId: string
    planCode: string
    status: string
  } | null
}

export default function UsersBalancePage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [searching, setSearching] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [showTopupDialog, setShowTopupDialog] = useState(false)
  const [showHistoryDialog, setShowHistoryDialog] = useState(false)

  // Load initial users
  useEffect(() => {
    loadUsers()
  }, [])

  const loadUsers = async () => {
    setLoading(true)

    try {
      const result = await getAllUsersWithBalances(50)
      setUsers(result.users)
    } catch (error) {
      console.error('Error loading users:', error)
      toast.error('Не удалось загрузить пользователей')
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!searchQuery.trim()) {
      loadUsers()
      return
    }

    setSearching(true)

    try {
      const results = await searchUsers(searchQuery)
      setUsers(results)
    } catch (error) {
      console.error('Error searching users:', error)
      toast.error(error instanceof Error ? error.message : 'Поиск не удался')
    } finally {
      setSearching(false)
    }
  }

  const handleTopupClick = (user: User) => {
    setSelectedUser(user)
    setShowTopupDialog(true)
  }

  const handleHistoryClick = (user: User) => {
    setSelectedUser(user)
    setShowHistoryDialog(true)
  }

  const handleTopupSuccess = () => {
    setShowTopupDialog(false)
    loadUsers()
  }

  return (
    <div className='space-y-6'>
      <div>
        <h1 className='text-3xl font-bold'>Балансы токенов пользователей</h1>
        <p className='text-muted-foreground'>Управление и мониторинг балансов токенов пользователей</p>
      </div>

      {/* Search and Filter */}
      <Card>
        <CardHeader>
          <CardTitle>Поиск пользователей</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSearch} className='flex gap-2'>
            <div className='flex-1 space-y-2'>
              <Label htmlFor='search'>Электронная почта или имя</Label>
              <Input
                id='search'
                placeholder='Поиск по электронной почте или имени...'
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                disabled={searching}
              />
            </div>
            <div className='flex items-end gap-2'>
              <Button type='submit' disabled={searching}>
                <Search className='mr-2 h-4 w-4' />
                {searching ? 'Поиск...' : 'Найти'}
              </Button>
              <Button
                type='button'
                variant='outline'
                onClick={() => {
                  setSearchQuery('')
                  loadUsers()
                }}
                disabled={searching}
              >
                Сброс
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle>Пользователи</CardTitle>
          <CardDescription>Все пользователи с их текущими балансами токенов</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className='py-8 text-center text-muted-foreground'>Загрузка пользователей...</div>
          ) : users.length === 0 ? (
            <div className='py-8 text-center text-muted-foreground'>Пользователи не найдены</div>
          ) : (
            <div className='rounded-lg border'>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Электронная почта</TableHead>
                    <TableHead>Имя</TableHead>
                    <TableHead>Подписка</TableHead>
                    <TableHead className='text-right'>Баланс</TableHead>
                    <TableHead>Создано</TableHead>
                    <TableHead>Последняя транзакция</TableHead>
                    <TableHead>Действия</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className='font-medium'>{user.email || 'Н/Д'}</TableCell>
                      <TableCell>{user.name || 'Н/Д'}</TableCell>
                      <TableCell>
                        <UserSubscriptionSelect
                          userId={user.id}
                          currentPlanId={user.subscription?.planId}
                          currentPlanCode={user.subscription?.planCode}
                        />
                      </TableCell>
                      <TableCell className='text-right'>
                        <div className='flex items-center justify-end gap-1'>
                          <Coins className='h-4 w-4 text-yellow-600' />
                          {user.tokenBalance.toLocaleString('ru-RU')}
                        </div>
                      </TableCell>
                      <TableCell className='text-sm text-muted-foreground'>
                        {new Date(user.createdAt).toLocaleDateString('ru-RU')}
                      </TableCell>
                      <TableCell className='text-sm'>
                        {user.lastTransaction
                          ? `${new Date(user.lastTransaction).toLocaleDateString('ru-RU')} (${user.lastTransactionType})`
                          : 'Нет'}
                      </TableCell>
                      <TableCell>
                        <div className='flex gap-2'>
                          <Button
                            size='sm'
                            variant='outline'
                            onClick={() => handleTopupClick(user)}
                          >
                            Пополнить
                          </Button>
                          <Button
                            size='sm'
                            variant='ghost'
                            onClick={() => handleHistoryClick(user)}
                          >
                            История
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialogs */}
      {selectedUser && (
        <>
          <TopupUserDialog
            open={showTopupDialog}
            onOpenChange={setShowTopupDialog}
            user={selectedUser}
            onSuccess={handleTopupSuccess}
          />
          <TransactionHistoryDialog
            open={showHistoryDialog}
            onOpenChange={setShowHistoryDialog}
            user={selectedUser}
          />
        </>
      )}
    </div>
  )
}

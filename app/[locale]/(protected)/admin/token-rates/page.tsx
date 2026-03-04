import { notFound, redirect } from 'next/navigation'
import { auth } from '@/auth'
import { getTokenRates, getActiveTokenRate, createTokenRate } from '@/actions/token-rates'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Coins } from 'lucide-react'
import TokenRatesForm from './components/token-rates-form'
import TokenRatesHistory from './components/token-rates-history'

export const metadata = {
  title: 'Курсы токенов',
  description: 'Управление курсами конвертации токенов',
}

export default async function TokenRatesPage() {
  const session = await auth()

  if (!session?.user || session.user.role !== 'ADMIN') {
    redirect('/login')
  }

  try {
    const [activeRate, ratesData] = await Promise.all([getActiveTokenRate(), getTokenRates()])

    return (
      <div className='space-y-6'>
        <div>
          <h1 className='text-3xl font-bold'>Курсы конвертации токенов</h1>
          <p className='text-muted-foreground'>Управление курсами конвертации рублей и LLM токенов в платформенные токены</p>
        </div>

        {/* Current Rate Display */}
        {activeRate && (
          <div className='grid gap-4 md:grid-cols-2'>
            <Card>
              <CardHeader className='pb-2'>
                <CardTitle className='flex items-center gap-2 text-sm font-medium'>
                  <Coins className='h-4 w-4' />
                  Курс рублей к токенам
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className='text-3xl font-bold'>1 ₽ = {activeRate.rubToTokenRate} токенов</div>
                <p className='text-xs text-muted-foreground'>Обновлено {new Date(activeRate.createdAt).toLocaleDateString('ru-RU')}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className='pb-2'>
                <CardTitle className='flex items-center gap-2 text-sm font-medium'>
                  <Coins className='h-4 w-4' />
                  Курс LLM токенов
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className='text-3xl font-bold'>1 LLM = {activeRate.llmTokenToTokenRate} токенов</div>
                <p className='text-xs text-muted-foreground'>Обновлено {new Date(activeRate.createdAt).toLocaleDateString('ru-RU')}</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Form to create new rate */}
        <Card>
          <CardHeader>
            <CardTitle>Создать новый курс</CardTitle>
            <CardDescription>
              Создание нового курса автоматически деактивирует предыдущий
            </CardDescription>
          </CardHeader>
          <CardContent>
            <TokenRatesForm />
          </CardContent>
        </Card>

        {/* History */}
        <Card>
          <CardHeader>
            <CardTitle>История курсов</CardTitle>
            <CardDescription>Все конфигурации курсов в хронологическом порядке</CardDescription>
          </CardHeader>
          <CardContent>
            <TokenRatesHistory configs={ratesData.configs} total={ratesData.total} />
          </CardContent>
        </Card>
      </div>
    )
  } catch (error) {
    console.error('Error loading token rates:', error)
    return (
      <div>
        <h1 className='text-3xl font-bold'>Ошибка</h1>
        <p>Не удалось загрузить курсы токенов. Пожалуйста, попробуйте снова.</p>
      </div>
    )
  }
}

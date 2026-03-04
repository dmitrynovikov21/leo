import { notFound, redirect } from 'next/navigation'
import { auth } from '@/auth'
import { getModelCosts, seedDefaultModelCosts } from '@/actions/model-costs'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import ModelCostsTable from './components/model-costs-table'
import ModelCostForm from './components/model-cost-form'

export const metadata = {
  title: 'Стоимость моделей',
  description: 'Управление ценами моделей ИИ',
}

export default async function ModelCostsPage() {
  const session = await auth()

  if (!session?.user || session.user.role !== 'ADMIN') {
    redirect('/login')
  }

  let costsData: {
    configs: Array<{
      id: string
      modelName: string
      inputCostPerMillion: number
      outputCostPerMillion: number
      isActive: boolean
      createdAt: Date
      updatedBy: string
    }>, total: number
  } = { configs: [], total: 0 }

  try {
    costsData = await getModelCosts(100)
  } catch (error) {
    console.error('Error loading model costs:', error)
    // Continue with empty data instead of showing error page
  }

  return (
    <div className='space-y-6'>
      <div className='flex items-center justify-between'>
        <div>
          <h1 className='text-3xl font-bold'>Стоимость моделей ИИ</h1>
          <p className='text-muted-foreground'>Управление ценами моделей в USD за 1 млн токенов</p>
        </div>
      </div>

      {/* Add/Edit Form */}
      <Card>
        <CardHeader>
          <CardTitle>Добавить или обновить стоимость модели</CardTitle>
          <CardDescription>
            Установите стоимость входных и выходных токенов для моделей. Эти значения используются для расчёта реальных затрат на LLM.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ModelCostForm />
        </CardContent>
      </Card>

      {/* Models Table */}
      <Card>
        <CardHeader>
          <CardTitle>Стоимость моделей</CardTitle>
          <CardDescription>Все настроенные модели с их ценами</CardDescription>
        </CardHeader>
        <CardContent>
          <ModelCostsTable configs={costsData.configs} total={costsData.total} />
        </CardContent>
      </Card>
    </div>
  )
}

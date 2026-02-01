'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { deleteModelCost } from '@/actions/model-costs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Trash2 } from 'lucide-react'
import { toast } from 'sonner'

interface ModelCostConfig {
  id: string
  modelName: string
  inputCostPerMillion: number
  outputCostPerMillion: number
  isActive: boolean
  createdAt: Date
  updatedBy: string
}

export default function ModelCostsTable({ configs, total }: { configs: ModelCostConfig[]; total: number }) {
  const router = useRouter()
  const [deleting, setDeleting] = useState<string | null>(null)

  const handleDelete = async (id: string) => {
    if (!confirm('Вы уверены, что хотите деактивировать стоимость этой модели?')) {
      return
    }

    setDeleting(id)

    try {
      await deleteModelCost(id)
      toast.success('Стоимость модели деактивирована')
      router.refresh()
    } catch (error) {
      console.error('Error deleting model cost:', error)
      toast.error(error instanceof Error ? error.message : 'Не удалось удалить стоимость модели')
    } finally {
      setDeleting(null)
    }
  }

  if (configs.length === 0) {
    return <div className='py-8 text-center text-gray-500'>Стоимость моделей не настроена</div>
  }

  return (
    <div className='space-y-4'>
      <div className='rounded-lg border'>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Модель</TableHead>
              <TableHead>Входные токены ($/1M)</TableHead>
              <TableHead>Выходные токены ($/1M)</TableHead>
              <TableHead>Статус</TableHead>
              <TableHead>Создано</TableHead>
              <TableHead>Действия</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {configs.map((config) => (
              <TableRow key={config.id}>
                <TableCell className='font-medium'>{config.modelName}</TableCell>
                <TableCell>${config.inputCostPerMillion.toFixed(4)}</TableCell>
                <TableCell>${config.outputCostPerMillion.toFixed(4)}</TableCell>
                <TableCell>
                  {config.isActive ? (
                    <Badge variant='default' className='bg-green-600'>
                      Активен
                    </Badge>
                  ) : (
                    <Badge variant='secondary'>Неактивен</Badge>
                  )}
                </TableCell>
                <TableCell className='text-sm text-gray-500'>
                  {new Date(config.createdAt).toLocaleDateString('ru-RU')}
                </TableCell>
                <TableCell>
                  {config.isActive && (
                    <Button
                      variant='ghost'
                      size='sm'
                      onClick={() => handleDelete(config.id)}
                      disabled={deleting === config.id}
                    >
                      <Trash2 className='h-4 w-4' />
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {configs.length < total && (
        <div className='text-sm text-gray-500'>Показаны {configs.length} из {total} конфигураций</div>
      )}
    </div>
  )
}

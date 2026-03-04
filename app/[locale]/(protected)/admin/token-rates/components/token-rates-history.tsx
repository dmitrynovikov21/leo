'use client'

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'

interface TokenRateConfig {
  id: string
  rubToTokenRate: number
  llmTokenToTokenRate: number
  isActive: boolean
  createdAt: Date
  updatedBy: string
}

export default function TokenRatesHistory({ configs, total }: { configs: TokenRateConfig[]; total: number }) {
  if (configs.length === 0) {
    return <div className='py-8 text-center text-muted-foreground'>Конфигурации курсов не найдены</div>
  }

  return (
    <div className='space-y-4'>
      <div className='rounded-lg border'>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Статус</TableHead>
              <TableHead>Руб → Токен</TableHead>
              <TableHead>LLM Токен → Токен</TableHead>
              <TableHead>Создано</TableHead>
              <TableHead>Автор</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {configs.map((config) => (
              <TableRow key={config.id}>
                <TableCell>
                  {config.isActive ? (
                    <Badge variant='default' className='bg-green-600'>
                      Активен
                    </Badge>
                  ) : (
                    <Badge variant='secondary'>Неактивен</Badge>
                  )}
                </TableCell>
                <TableCell className='font-medium'>
                  1₽ = {config.rubToTokenRate} токенов
                </TableCell>
                <TableCell>1 LLM = {config.llmTokenToTokenRate} токенов</TableCell>
                <TableCell>{new Date(config.createdAt).toLocaleDateString('ru-RU')}</TableCell>
                <TableCell className='text-sm text-muted-foreground'>{config.updatedBy}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {configs.length < total && (
        <div className='text-sm text-muted-foreground'>Показаны {configs.length} из {total} конфигураций</div>
      )}
    </div>
  )
}

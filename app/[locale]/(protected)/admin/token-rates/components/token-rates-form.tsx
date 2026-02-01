'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createTokenRate } from '@/actions/token-rates'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'

export default function TokenRatesForm() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [rubToTokenRate, setRubToTokenRate] = useState('')
  const [llmTokenToTokenRate, setLlmTokenToTokenRate] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!rubToTokenRate || !llmTokenToTokenRate) {
      toast.error('Пожалуйста, заполните все поля')
      return
    }

    const rubRate = parseFloat(rubToTokenRate)
    const llmRate = parseFloat(llmTokenToTokenRate)

    if (rubRate <= 0 || llmRate <= 0) {
      toast.error('Курсы должны быть больше 0')
      return
    }

    setLoading(true)

    try {
      await createTokenRate({
        rubToTokenRate: rubRate,
        llmTokenToTokenRate: llmRate,
      })

      toast.success('Курс токенов успешно создан')
      setRubToTokenRate('')
      setLlmTokenToTokenRate('')
      router.refresh()
    } catch (error) {
      console.error('Error creating token rate:', error)
      toast.error(error instanceof Error ? error.message : 'Не удалось создать курс токенов')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className='space-y-4'>
      <div className='grid gap-4 md:grid-cols-2'>
        <div className='space-y-2'>
          <Label htmlFor='rubToToken'>Рубли в токены (1₽ = ? токенов)</Label>
          <Input
            id='rubToToken'
            type='number'
            step='0.01'
            min='0'
            placeholder='напр., 2.0'
            value={rubToTokenRate}
            onChange={(e) => setRubToTokenRate(e.target.value)}
            disabled={loading}
          />
        </div>

        <div className='space-y-2'>
          <Label htmlFor='llmToToken'>LLM токены в платформенные токены (1 LLM = ? токенов)</Label>
          <Input
            id='llmToToken'
            type='number'
            step='0.0001'
            min='0'
            placeholder='напр., 2.0'
            value={llmTokenToTokenRate}
            onChange={(e) => setLlmTokenToTokenRate(e.target.value)}
            disabled={loading}
          />
        </div>
      </div>

      <div className='flex justify-end gap-2'>
        <Button
          type='button'
          variant='outline'
          onClick={() => {
            setRubToTokenRate('')
            setLlmTokenToTokenRate('')
          }}
          disabled={loading}
        >
          Очистить
        </Button>
        <Button type='submit' disabled={loading}>
          {loading ? 'Создание...' : 'Создать новый курс'}
        </Button>
      </div>
    </form>
  )
}

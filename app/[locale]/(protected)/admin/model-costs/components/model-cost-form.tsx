'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { upsertModelCost } from '@/actions/model-costs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'

const POPULAR_MODELS = [
  'claude-sonnet-4-6',
  'claude-opus-4-6',
  'claude-sonnet-4-5',
  'gemini-3.1-pro-preview',
  'gemini-2.5-pro',
]

export default function ModelCostForm() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [modelName, setModelName] = useState('')
  const [inputCost, setInputCost] = useState('')
  const [outputCost, setOutputCost] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!modelName || !inputCost || !outputCost) {
      toast.error('Пожалуйста, заполните все поля')
      return
    }

    const input = parseFloat(inputCost)
    const output = parseFloat(outputCost)

    if (input < 0 || output < 0) {
      toast.error('Стоимость не может быть отрицательной')
      return
    }

    setLoading(true)

    try {
      await upsertModelCost({
        modelName,
        inputCostPerMillion: input,
        outputCostPerMillion: output,
        isActive: true,
      })

      toast.success('Стоимость модели успешно сохранена')
      setModelName('')
      setInputCost('')
      setOutputCost('')
      router.refresh()
    } catch (error) {
      console.error('Error saving model cost:', error)
      toast.error(error instanceof Error ? error.message : 'Не удалось сохранить стоимость модели')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className='space-y-4'>
      <div className='space-y-2'>
        <Label htmlFor='modelName'>Название модели</Label>
        <div className='space-y-2'>
          <Input
            id='modelName'
            placeholder='напр., claude-sonnet-4-6, gemini-2.5-pro'
            value={modelName}
            onChange={(e) => setModelName(e.target.value)}
            disabled={loading}
          />
          <div className='flex flex-wrap gap-2'>
            {POPULAR_MODELS.map((model) => (
              <Button
                key={model}
                type='button'
                variant='outline'
                size='sm'
                onClick={() => setModelName(model)}
                disabled={loading}
              >
                {model}
              </Button>
            ))}
          </div>
        </div>
      </div>

      <div className='grid gap-4 md:grid-cols-2'>
        <div className='space-y-2'>
          <Label htmlFor='inputCost'>Стоимость входных токенов ($ за 1M токенов)</Label>
          <Input
            id='inputCost'
            type='number'
            step='0.0001'
            min='0'
            placeholder='напр., 2.5'
            value={inputCost}
            onChange={(e) => setInputCost(e.target.value)}
            disabled={loading}
          />
        </div>

        <div className='space-y-2'>
          <Label htmlFor='outputCost'>Стоимость выходных токенов ($ за 1M токенов)</Label>
          <Input
            id='outputCost'
            type='number'
            step='0.0001'
            min='0'
            placeholder='напр., 10.0'
            value={outputCost}
            onChange={(e) => setOutputCost(e.target.value)}
            disabled={loading}
          />
        </div>
      </div>

      <div className='flex justify-end gap-2'>
        <Button
          type='button'
          variant='outline'
          onClick={() => {
            setModelName('')
            setInputCost('')
            setOutputCost('')
          }}
          disabled={loading}
        >
          Очистить
        </Button>
        <Button type='submit' disabled={loading}>
          {loading ? 'Сохранение...' : 'Сохранить стоимость модели'}
        </Button>
      </div>
    </form>
  )
}

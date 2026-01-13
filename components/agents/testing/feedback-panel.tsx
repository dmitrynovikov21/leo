"use client"

import * as React from "react"
import { CheckCircle2, Clock, Plus, Trash2, Play, Loader2 } from "lucide-react"
import { useTranslations } from "next-intl"
import { useParams } from "next/navigation"

import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { toast } from "sonner"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"

export interface TestCaseItem {
    id: string
    question: string
    expectedAnswer: string
    status: 'pending' | 'running' | 'passed' | 'failed'
    actualAnswer?: string
    matchPercentage?: number
}

interface FeedbackPanelProps {
    testCases: TestCaseItem[]
    setTestCases: React.Dispatch<React.SetStateAction<TestCaseItem[]>>
    onRunTests: () => void
    isRunning: boolean
    onAddTestCase?: (question: string, expectedAnswer: string) => Promise<void>
    onRemoveTestCase?: (id: string) => Promise<void>
}

// Calculate string similarity (simple word overlap)
function calculateSimilarity(expected: string, actual: string): number {
    const expectedWords = expected.toLowerCase().split(/\s+/).filter(w => w.length > 2)
    const actualWords = actual.toLowerCase().split(/\s+/).filter(w => w.length > 2)

    if (expectedWords.length === 0) return 100

    let matchCount = 0
    for (const word of expectedWords) {
        if (actualWords.some(w => w.includes(word) || word.includes(w))) {
            matchCount++
        }
    }

    return Math.round((matchCount / expectedWords.length) * 100)
}

export function FeedbackPanel({ testCases, setTestCases, onRunTests, isRunning, onAddTestCase, onRemoveTestCase }: FeedbackPanelProps) {
    const pendingCount = testCases.filter(i => i.status === 'pending').length
    const [isAddOpen, setIsAddOpen] = React.useState(false)
    const [newQuestion, setNewQuestion] = React.useState("")
    const [newExpected, setNewExpected] = React.useState("")
    const [isAdding, setIsAdding] = React.useState(false)

    const handleAddTestCase = async () => {
        if (!newQuestion.trim() || !newExpected.trim()) {
            toast.error("Заполните оба поля")
            return
        }

        if (onAddTestCase) {
            setIsAdding(true)
            await onAddTestCase(newQuestion.trim(), newExpected.trim())
            setIsAdding(false)
        } else {
            // Fallback to local state
            const newItem: TestCaseItem = {
                id: Date.now().toString(),
                question: newQuestion.trim(),
                expectedAnswer: newExpected.trim(),
                status: 'pending'
            }
            setTestCases(prev => [...prev, newItem])
            toast.success("Добавлено в очередь")
        }

        setNewQuestion("")
        setNewExpected("")
        setIsAddOpen(false)
    }

    const handleRemoveTestCase = async (id: string) => {
        if (onRemoveTestCase) {
            await onRemoveTestCase(id)
        } else {
            setTestCases(prev => prev.filter(tc => tc.id !== id))
        }
    }

    const getStatusIcon = (status: TestCaseItem['status']) => {
        switch (status) {
            case 'passed':
                return <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
            case 'failed':
                return <Clock className="h-3.5 w-3.5 text-red-500" />
            case 'running':
                return <Loader2 className="h-3.5 w-3.5 text-blue-500 animate-spin" />
            default:
                return <Clock className="h-3.5 w-3.5 text-amber-500" />
        }
    }

    const getStatusBadge = (item: TestCaseItem) => {
        switch (item.status) {
            case 'passed':
                return <Badge className="bg-green-100 text-green-700 text-[10px]">Пройден ({item.matchPercentage}%)</Badge>
            case 'failed':
                return <Badge className="bg-red-100 text-red-700 text-[10px]">Провален ({item.matchPercentage}%)</Badge>
            case 'running':
                return <Badge className="bg-blue-100 text-blue-700 text-[10px]">Выполняется...</Badge>
            default:
                return null
        }
    }

    return (
        <div className="flex h-full flex-col border-l border-zinc-100 bg-white relative">
            {/* Header */}
            <div className="flex h-12 items-center justify-between border-b border-zinc-100 px-4">
                <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Тест-кейсы</span>
                <Badge variant="secondary" className="bg-zinc-50 text-zinc-600 rounded-md px-2 text-[10px] font-medium border border-zinc-100">
                    {pendingCount} В ОЧЕРЕДИ
                </Badge>
            </div>

            {/* Content list */}
            <div className="flex-1 overflow-hidden relative">
                {testCases.length === 0 ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center bg-white">
                        <button
                            onClick={() => setIsAddOpen(true)}
                            className="h-14 w-14 rounded-full bg-zinc-50 hover:bg-zinc-100 flex items-center justify-center mb-4 transition-all cursor-pointer group shadow-sm hover:shadow-md border border-zinc-100"
                        >
                            <Plus className="h-6 w-6 text-zinc-300 group-hover:text-zinc-600 transition-colors" />
                        </button>
                        <h3 className="text-sm font-medium text-zinc-900 mb-1">Очередь пуста</h3>
                        <p className="text-xs text-zinc-400 max-w-[180px] leading-relaxed">
                            Добавьте вопросы и ожидаемые ответы для автотестирования.
                        </p>
                    </div>
                ) : (
                    <ScrollArea className="h-full pb-20">
                        <div className="p-4 space-y-3">
                            {testCases.map((item, idx) => (
                                <Card key={item.id} className="p-3 bg-white border-zinc-100 shadow-[0_2px_8px_rgba(0,0,0,0.02)] rounded-xl group hover:border-zinc-200 transition-all">
                                    <div className="flex items-start gap-3">
                                        <div className="mt-0.5">
                                            {getStatusIcon(item.status)}
                                        </div>
                                        <div className="flex-1 space-y-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <span className="text-[10px] font-mono text-zinc-400">#{idx + 1}</span>
                                                {getStatusBadge(item)}
                                            </div>
                                            <p className="text-sm text-zinc-700 leading-snug font-medium truncate">{item.question}</p>
                                            <p className="text-[11px] text-zinc-400 truncate">Ожидается: {item.expectedAnswer}</p>
                                            {item.actualAnswer && (
                                                <p className="text-[11px] text-zinc-500 truncate mt-1 pt-1 border-t border-zinc-100">
                                                    Ответ: {item.actualAnswer}
                                                </p>
                                            )}
                                        </div>
                                        {item.status === 'pending' && (
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-6 w-6 text-zinc-300 hover:text-red-500 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                                onClick={() => handleRemoveTestCase(item.id)}
                                            >
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </Button>
                                        )}
                                    </div>
                                </Card>
                            ))}
                            {/* Small add button when list is not empty */}
                            <Button
                                variant="ghost"
                                size="sm"
                                className="w-full text-xs text-zinc-400 hover:text-zinc-900 border border-dashed border-zinc-200 hover:border-zinc-300 h-9 font-normal rounded-xl hover:bg-zinc-50"
                                onClick={() => setIsAddOpen(true)}
                            >
                                <Plus className="h-3 w-3 mr-2" /> Добавить тест-кейс
                            </Button>
                        </div>
                    </ScrollArea>
                )}
            </div>

            {/* Floating Footer Action - Run Tests */}
            <div className="absolute bottom-6 left-0 right-0 flex justify-center px-6 pointer-events-none z-10">
                <Button
                    className="rounded-full shadow-2xl shadow-zinc-900/20 h-11 px-6 gap-2 font-medium bg-zinc-900 text-white hover:bg-zinc-800 backdrop-blur-md pointer-events-auto transition-all hover:scale-[1.02] active:scale-[0.98] border border-white/10"
                    disabled={pendingCount === 0 || isRunning}
                    onClick={onRunTests}
                >
                    {isRunning ? (
                        <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Тестирование...
                        </>
                    ) : (
                        <>
                            <Play className="h-4 w-4" />
                            Запустить тесты
                            {pendingCount > 0 && (
                                <span className="ml-1 bg-white/20 px-1.5 py-0.5 rounded-full text-[10px] font-bold min-w-[18px]">
                                    {pendingCount}
                                </span>
                            )}
                        </>
                    )}
                </Button>
            </div>

            {/* Add Test Case Dialog */}
            <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                <DialogContent className="sm:max-w-[425px] rounded-2xl p-6 shadow-2xl border-zinc-100">
                    <DialogHeader>
                        <DialogTitle className="text-lg font-semibold">Добавить тест-кейс</DialogTitle>
                        <DialogDescription className="text-zinc-500">
                            Укажите вопрос и ожидаемый ответ. Тест проверит, что ответ агента содержит ключевые слова.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-2">
                        <div className="grid gap-2">
                            <Label htmlFor="question" className="text-xs font-semibold text-zinc-500 uppercase">Вопрос</Label>
                            <Input
                                id="question"
                                placeholder="Что спросить у агента?"
                                className="rounded-xl bg-zinc-50 border-zinc-200"
                                value={newQuestion}
                                onChange={(e) => setNewQuestion(e.target.value)}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="expected" className="text-xs font-semibold text-zinc-500 uppercase">Ожидаемый ответ</Label>
                            <Textarea
                                id="expected"
                                placeholder="Ключевые слова или фраза, которая должна быть в ответе"
                                className="h-24 resize-none rounded-xl bg-zinc-50 border-zinc-200 focus:ring-0 focus:border-zinc-300 transition-all font-medium text-sm"
                                value={newExpected}
                                onChange={(e) => setNewExpected(e.target.value)}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsAddOpen(false)} className="rounded-xl border-zinc-200 h-10 hover:bg-zinc-50">Отмена</Button>
                        <Button onClick={handleAddTestCase} className="rounded-xl h-10 bg-zinc-900 text-white hover:bg-zinc-800 shadow-md">Добавить</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}

// Export the calculateSimilarity function for use in test runner
export { calculateSimilarity }

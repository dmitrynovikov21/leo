"use client"

import * as React from "react"
import { Zap, Loader2, Play, RotateCcw, Plus, Trash2 } from "lucide-react"
import { useTranslations } from "next-intl"
import { useParams } from "next/navigation"

import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { TestResultScorecard, type TestReport } from "@/components/agents/testing/test-result-scorecard"
import { toast } from "sonner"

interface TestCase {
    id: string
    question: string
    expectedAnswer: string
}

interface TestResult {
    id: string
    question: string
    expectedAnswer: string
    actualAnswer: string
    passed: boolean
    matchPercentage: number
}

type TestState = "idle" | "running" | "complete"

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

export function AutoTestRunner() {
    const t = useTranslations('Testing')
    const params = useParams()
    const agentId = params.agentId as string

    const [testCases, setTestCases] = React.useState<TestCase[]>([
        { id: "1", question: "Каковы ваши часы работы?", expectedAnswer: "с 9:00 до 18:00" },
        { id: "2", question: "Есть ли у вас возврат?", expectedAnswer: "да, в течение 30 дней" },
    ])
    const [newQuestion, setNewQuestion] = React.useState("")
    const [newExpected, setNewExpected] = React.useState("")

    const [status, setStatus] = React.useState<TestState>("idle")
    const [progress, setProgress] = React.useState(0)
    const [logs, setLogs] = React.useState<string[]>([])
    const [results, setResults] = React.useState<TestResult[]>([])
    const [sessionId, setSessionId] = React.useState<string | null>(null)
    const scrollRef = React.useRef<HTMLDivElement>(null)

    const gatewayUrl = process.env.NEXT_PUBLIC_AI_GATEWAY_URL || ''

    const addLog = (msg: string) => {
        setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`])
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight
        }
    }

    const addTestCase = () => {
        if (!newQuestion.trim() || !newExpected.trim()) {
            toast.error("Заполните оба поля")
            return
        }
        setTestCases(prev => [
            ...prev,
            { id: Date.now().toString(), question: newQuestion.trim(), expectedAnswer: newExpected.trim() }
        ])
        setNewQuestion("")
        setNewExpected("")
    }

    const removeTestCase = (id: string) => {
        setTestCases(prev => prev.filter(tc => tc.id !== id))
    }

    const runTest = async () => {
        if (testCases.length === 0) {
            toast.error("Добавьте хотя бы один тест-кейс")
            return
        }

        setStatus("running")
        setProgress(0)
        setLogs([])
        setResults([])

        addLog("Запуск автотестов...")
        addLog(`Всего тест-кейсов: ${testCases.length}`)

        const testResults: TestResult[] = []
        let currentSessionId = sessionId

        for (let i = 0; i < testCases.length; i++) {
            const testCase = testCases[i]
            setProgress(Math.round(((i + 1) / testCases.length) * 100))
            addLog(`[${i + 1}/${testCases.length}] Отправка: "${testCase.question}"`)

            try {
                const requestBody: { message: string; is_test: boolean; session_id?: string } = {
                    message: testCase.question,
                    is_test: true
                }
                if (currentSessionId) {
                    requestBody.session_id = currentSessionId
                }

                const response = await fetch(`${gatewayUrl}/api/v1/agents/${agentId}/chat`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(requestBody)
                })

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}`)
                }

                const data = await response.json()

                if (data.sessionId && data.sessionId !== currentSessionId) {
                    currentSessionId = data.sessionId
                    setSessionId(data.sessionId)
                }

                const actualAnswer = data.response || data.message || ''
                const matchPercentage = calculateSimilarity(testCase.expectedAnswer, actualAnswer)
                const passed = matchPercentage >= 50

                addLog(`[${i + 1}/${testCases.length}] Получен ответ (совпадение: ${matchPercentage}%)`)

                testResults.push({
                    id: testCase.id,
                    question: testCase.question,
                    expectedAnswer: testCase.expectedAnswer,
                    actualAnswer,
                    passed,
                    matchPercentage
                })
            } catch (error) {
                addLog(`[${i + 1}/${testCases.length}] Ошибка: ${error}`)
                testResults.push({
                    id: testCase.id,
                    question: testCase.question,
                    expectedAnswer: testCase.expectedAnswer,
                    actualAnswer: `Ошибка: ${error}`,
                    passed: false,
                    matchPercentage: 0
                })
            }
        }

        setResults(testResults)
        addLog("Тестирование завершено!")
        setStatus("complete")
    }

    const report: TestReport = React.useMemo(() => {
        const passedCount = results.filter(r => r.passed).length
        const totalCount = results.length
        const score = totalCount > 0 ? Math.round((passedCount / totalCount) * 100) : 0

        return {
            score,
            passedCount,
            totalCount,
            results: results.map(r => ({
                id: r.id,
                question: r.question,
                answer: r.actualAnswer,
                passed: r.passed,
                reasoning: `Ожидалось: "${r.expectedAnswer}"\nСовпадение: ${r.matchPercentage}%`,
            }))
        }
    }, [results])

    if (status === "complete") {
        return (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                <div className="flex justify-between items-center">
                    <h2 className="text-2xl font-bold text-zinc-900">{t('testResults')}</h2>
                    <Button variant="outline" onClick={() => setStatus("idle")} className="rounded-xl border-zinc-200">
                        <RotateCcw className="mr-2 h-4 w-4" />
                        {t('runAgain')}
                    </Button>
                </div>
                <TestResultScorecard report={report} />
            </div>
        )
    }

    return (
        <div className="space-y-8 max-w-3xl mx-auto">
            {status === "idle" && (
                <>
                    {/* Header */}
                    <div className="text-center space-y-4">
                        <div className="w-16 h-16 bg-zinc-100 rounded-full flex items-center justify-center mx-auto border border-zinc-200">
                            <Zap className="h-8 w-8 text-zinc-900" />
                        </div>
                        <div className="space-y-2">
                            <h2 className="text-2xl font-bold tracking-tight text-zinc-900">{t('autoLab')}</h2>
                            <p className="text-zinc-500 max-w-md mx-auto">
                                Добавьте вопросы и ожидаемые ответы. Тест проверит, что ответ агента содержит не менее 50% слов из ожидаемого.
                            </p>
                        </div>
                    </div>

                    {/* Test Cases List */}
                    <Card className="border border-zinc-200 rounded-2xl shadow-sm">
                        <CardContent className="pt-6 space-y-4">
                            <Label className="text-sm font-semibold text-zinc-700">Очередь тест-кейсов ({testCases.length})</Label>

                            {testCases.length === 0 ? (
                                <div className="text-center py-8 text-zinc-400 text-sm">
                                    Добавьте тест-кейсы ниже
                                </div>
                            ) : (
                                <div className="space-y-2 max-h-64 overflow-y-auto">
                                    {testCases.map((tc, idx) => (
                                        <div key={tc.id} className="flex items-start gap-2 p-3 bg-zinc-50 rounded-xl border border-zinc-100">
                                            <span className="text-xs font-mono text-zinc-400 mt-1">#{idx + 1}</span>
                                            <div className="flex-1 min-w-0">
                                                <div className="text-sm font-medium text-zinc-900 truncate">{tc.question}</div>
                                                <div className="text-xs text-zinc-500 mt-0.5 truncate">Ожидается: {tc.expectedAnswer}</div>
                                            </div>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-7 w-7 text-zinc-400 hover:text-red-500 shrink-0"
                                                onClick={() => removeTestCase(tc.id)}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Add New Test Case */}
                    <Card className="border border-zinc-200 rounded-2xl shadow-sm">
                        <CardContent className="pt-6 space-y-4">
                            <Label className="text-sm font-semibold text-zinc-700">Добавить тест-кейс</Label>
                            <div className="space-y-3">
                                <Input
                                    placeholder="Вопрос (что спросить у агента)"
                                    value={newQuestion}
                                    onChange={(e) => setNewQuestion(e.target.value)}
                                    className="rounded-xl"
                                />
                                <Textarea
                                    placeholder="Ожидаемый ответ (ключевые слова или фраза)"
                                    value={newExpected}
                                    onChange={(e) => setNewExpected(e.target.value)}
                                    className="rounded-xl min-h-[80px] resize-none"
                                />
                                <Button onClick={addTestCase} variant="outline" className="w-full rounded-xl border-zinc-200">
                                    <Plus className="mr-2 h-4 w-4" />
                                    Добавить в очередь
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Run Button */}
                    <Button
                        size="lg"
                        className="w-full h-12 text-base shadow-lg bg-zinc-900 text-white hover:bg-zinc-800 rounded-xl"
                        onClick={runTest}
                        disabled={testCases.length === 0}
                    >
                        <Play className="mr-2 h-5 w-5 fill-current" />
                        {t('runStressTest')} ({testCases.length} тестов)
                    </Button>
                </>
            )}

            {status === "running" && (
                <Card className="w-full border border-zinc-200 rounded-2xl shadow-sm">
                    <CardContent className="pt-6 space-y-6">
                        <div className="space-y-2">
                            <div className="flex justify-between text-sm font-medium text-zinc-700">
                                <span className="flex items-center gap-2">
                                    <Loader2 className="h-4 w-4 animate-spin" /> {t('running')}
                                </span>
                                <span>{progress}%</span>
                            </div>
                            <Progress value={progress} className="h-3 rounded-full bg-zinc-100" />
                        </div>

                        <div
                            ref={scrollRef}
                            className="h-[200px] rounded-xl bg-zinc-950 text-emerald-500 font-mono text-xs p-4 overflow-y-auto space-y-1 shadow-inner"
                        >
                            {logs.map((log, i) => (
                                <div key={i}>{log}</div>
                            ))}
                            <div className="animate-pulse">_</div>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    )
}

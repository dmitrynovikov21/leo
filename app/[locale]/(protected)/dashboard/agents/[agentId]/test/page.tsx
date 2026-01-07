"use client"

import * as React from "react"
import { useTranslations } from "next-intl"
import { useParams } from "next/navigation"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable"

import { ManualTestInterface } from "@/components/testing/manual-test-interface"
import { FeedbackPanel, TestCaseItem, calculateSimilarity } from "@/components/agents/testing/feedback-panel"
import { TestResultScorecard, type TestReport } from "@/components/agents/testing/test-result-scorecard"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { RotateCcw } from "lucide-react"

export default function TestingPage() {
    const t = useTranslations('Testing')
    const params = useParams()
    const agentId = params.agentId as string

    const [activeTab, setActiveTab] = React.useState("manual")
    const [testCases, setTestCases] = React.useState<TestCaseItem[]>([
        { id: "1", question: "Каковы ваши часы работы?", expectedAnswer: "с 9:00 до 18:00", status: 'pending' },
        { id: "2", question: "Есть ли у вас возврат?", expectedAnswer: "да, в течение 30 дней", status: 'pending' },
    ])
    const [isRunning, setIsRunning] = React.useState(false)
    const [showResults, setShowResults] = React.useState(false)
    const [sessionId, setSessionId] = React.useState<string | null>(null)

    const gatewayUrl = process.env.NEXT_PUBLIC_AI_GATEWAY_URL || ''

    const handleFeedbackSubmit = (text: string) => {
        // Not used anymore, but kept for compatibility
    }

    const handleRunTests = async () => {
        const pendingCases = testCases.filter(tc => tc.status === 'pending')
        if (pendingCases.length === 0) {
            toast.error("Нет тест-кейсов для выполнения")
            return
        }

        setIsRunning(true)
        setShowResults(false)
        let currentSessionId = sessionId

        for (const testCase of pendingCases) {
            // Mark as running
            setTestCases(prev => prev.map(tc =>
                tc.id === testCase.id ? { ...tc, status: 'running' as const } : tc
            ))

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

                setTestCases(prev => prev.map(tc =>
                    tc.id === testCase.id ? {
                        ...tc,
                        status: passed ? 'passed' as const : 'failed' as const,
                        actualAnswer,
                        matchPercentage
                    } : tc
                ))
            } catch (error) {
                setTestCases(prev => prev.map(tc =>
                    tc.id === testCase.id ? {
                        ...tc,
                        status: 'failed' as const,
                        actualAnswer: `Ошибка: ${error}`,
                        matchPercentage: 0
                    } : tc
                ))
            }
        }

        setIsRunning(false)
        setShowResults(true)
        toast.success("Тестирование завершено!")
    }

    const handleResetTests = () => {
        setTestCases(prev => prev.map(tc => ({
            ...tc,
            status: 'pending' as const,
            actualAnswer: undefined,
            matchPercentage: undefined
        })))
        setShowResults(false)
    }

    // Generate report for results view
    const report: TestReport = React.useMemo(() => {
        const finishedCases = testCases.filter(tc => tc.status === 'passed' || tc.status === 'failed')
        const passedCount = testCases.filter(tc => tc.status === 'passed').length
        const totalCount = finishedCases.length
        const score = totalCount > 0 ? Math.round((passedCount / totalCount) * 100) : 0

        return {
            score,
            passedCount,
            totalCount,
            results: finishedCases.map(tc => ({
                id: tc.id,
                question: tc.question,
                answer: tc.actualAnswer || '',
                passed: tc.status === 'passed',
                reasoning: `Ожидалось: "${tc.expectedAnswer}"\nСовпадение: ${tc.matchPercentage || 0}%`,
            }))
        }
    }, [testCases])

    return (
        <div className="h-[calc(100vh-3.5rem)] bg-background p-2 overflow-hidden">
            <div className="h-full bg-white rounded-[24px] border border-zinc-200/60 shadow-sm overflow-hidden flex flex-col">
                <ResizablePanelGroup direction="horizontal" className="flex-1">
                    {/* LEFT PANEL: Test Runner */}
                    <ResizablePanel defaultSize={activeTab === 'auto' ? 60 : 100} minSize={30}>
                        <div className="h-full flex flex-col p-4">
                            <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
                                <div className="flex items-center justify-between mb-2 px-1">
                                    <div className="mb-2">
                                        <h2 className="text-xl font-semibold tracking-tight text-zinc-950">{t('qaLab')}</h2>
                                        <p className="text-xs text-zinc-500 mt-0.5">{t('testDebugCertify')}</p>
                                    </div>
                                    <TabsList className="bg-zinc-100/80 p-0.5 rounded-full inline-flex self-start scale-90 origin-right">
                                        <TabsTrigger value="manual" className="rounded-full px-3 py-1 text-xs data-[state=active]:bg-white data-[state=active]:text-zinc-950 data-[state=active]:shadow-sm text-zinc-500 font-medium transition-all">{t('manualTest')}</TabsTrigger>
                                        <TabsTrigger value="auto" className="rounded-full px-3 py-1 text-xs data-[state=active]:bg-white data-[state=active]:text-zinc-950 data-[state=active]:shadow-sm text-zinc-500 font-medium transition-all">{t('autoStressTest')}</TabsTrigger>
                                    </TabsList>
                                </div>

                                <div className="flex-1 overflow-hidden relative rounded-2xl border-0 bg-white mt-4">
                                    <TabsContent value="manual" className="h-full m-0 border-0 p-0">
                                        <ManualTestInterface onFeedbackSubmit={handleFeedbackSubmit} />
                                    </TabsContent>
                                    <TabsContent value="auto" className="h-full m-0 border-0 p-6 overflow-y-auto">
                                        {showResults ? (
                                            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                                                <div className="flex justify-between items-center">
                                                    <h2 className="text-2xl font-bold text-zinc-900">{t('testResults')}</h2>
                                                    <Button variant="outline" onClick={handleResetTests} className="rounded-xl border-zinc-200">
                                                        <RotateCcw className="mr-2 h-4 w-4" />
                                                        {t('runAgain')}
                                                    </Button>
                                                </div>
                                                <TestResultScorecard report={report} />
                                            </div>
                                        ) : (
                                            <div className="flex flex-col items-center justify-center h-full text-center">
                                                <div className="w-16 h-16 bg-zinc-100 rounded-full flex items-center justify-center mb-4 border border-zinc-200">
                                                    <span className="text-2xl">🧪</span>
                                                </div>
                                                <h3 className="text-lg font-semibold text-zinc-900 mb-2">Автотестирование</h3>
                                                <p className="text-sm text-zinc-500 max-w-sm">
                                                    Добавьте тест-кейсы в панели справа и нажмите "Запустить тесты" для проверки агента.
                                                </p>
                                            </div>
                                        )}
                                    </TabsContent>
                                </div>
                            </Tabs>
                        </div>
                    </ResizablePanel>

                    {/* RIGHT PANEL: Test Cases Queue - Only visible on auto tab */}
                    {activeTab === 'auto' && (
                        <>
                            <ResizableHandle withHandle className="bg-zinc-100 w-[1px]" />
                            <ResizablePanel
                                defaultSize={40}
                                minSize={25}
                                maxSize={50}
                                className="animate-in slide-in-from-right-4 duration-300"
                            >
                                <FeedbackPanel
                                    testCases={testCases}
                                    setTestCases={setTestCases}
                                    onRunTests={handleRunTests}
                                    isRunning={isRunning}
                                />
                            </ResizablePanel>
                        </>
                    )}
                </ResizablePanelGroup>
            </div>
        </div>
    )
}

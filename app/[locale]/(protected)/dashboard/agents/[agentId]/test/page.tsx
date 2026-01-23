"use client"

import * as React from "react"
import { useTranslations } from "next-intl"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

import { ManualTestInterface } from "@/components/testing/manual-test-interface"
import { AutoTestRunner } from "@/components/agents/testing/auto-test-runner"

export default function TestingPage() {
    const t = useTranslations('Testing')
    const [activeTab, setActiveTab] = React.useState("manual")

    return (
        <div className="h-full bg-background p-2 overflow-hidden">
            <div className="h-full bg-white rounded-[24px] border border-zinc-200/60 shadow-sm overflow-hidden flex flex-col">
                <div className="h-full flex flex-col p-4 w-full max-w-7xl mx-auto">
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
                        <div className="flex items-center justify-between mb-4 px-1 shrink-0">
                            <div>
                                <h2 className="text-lg font-semibold tracking-tight text-zinc-950">{t('qaLab')}</h2>
                                <p className="text-xs text-zinc-500">{t('testDebugCertify')}</p>
                            </div>
                            <TabsList className="bg-zinc-100/80 p-0.5 rounded-full inline-flex self-start scale-90 origin-right">
                                <TabsTrigger value="manual" className="rounded-full px-3 py-1 text-xs data-[state=active]:bg-white data-[state=active]:text-zinc-950 data-[state=active]:shadow-sm text-zinc-500 font-medium transition-all">{t('manualTest')}</TabsTrigger>
                                <TabsTrigger value="auto" className="rounded-full px-3 py-1 text-xs data-[state=active]:bg-white data-[state=active]:text-zinc-950 data-[state=active]:shadow-sm text-zinc-500 font-medium transition-all">{t('autoStressTest')}</TabsTrigger>
                            </TabsList>
                        </div>

                        <div className="flex-1 overflow-hidden relative rounded-2xl border-0 bg-white">
                            <TabsContent value="manual" className="h-full m-0 border-0 p-0">
                                <ManualTestInterface onFeedbackSubmit={() => { }} />
                            </TabsContent>
                            <TabsContent value="auto" className="h-full m-0 border-0 p-2 overflow-y-auto">
                                <AutoTestRunner />
                            </TabsContent>
                        </div>
                    </Tabs>
                </div>
            </div>
        </div>
    )
}

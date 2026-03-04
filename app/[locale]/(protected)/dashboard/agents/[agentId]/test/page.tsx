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
        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col space-y-4">
            <div className="flex items-center justify-between shrink-0">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">{t('qaLab')}</h2>
                    <p className="text-muted-foreground">{t('testDebugCertify')}</p>
                </div>
                <TabsList className="shrink-0 bg-muted/80">
                    <TabsTrigger value="manual">{t('manualTest')}</TabsTrigger>
                    <TabsTrigger value="auto">{t('autoStressTest')}</TabsTrigger>
                </TabsList>
            </div>

            <TabsContent value="manual" className="flex-1 border-0 p-0 overflow-hidden mt-0 data-[state=active]:flex flex-col">
                <ManualTestInterface onFeedbackSubmit={() => { }} />
            </TabsContent>
            <TabsContent value="auto" className="flex-1 border-0 p-0 overflow-y-auto mt-0">
                <AutoTestRunner />
            </TabsContent>
        </Tabs>
    )
}

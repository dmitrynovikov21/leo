"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion"
import { Progress } from "@/components/ui/progress"
import { CreditCard, CheckCircle2 } from "lucide-react"

export function PlanOverview() {
    const modelRates = [
        { model: "Claude Sonnet 4.6", inputRate: "₽1.80 / 1k tokens", outputRate: "₽2.40 / 1k tokens" },
        { model: "Claude Opus 4.6", inputRate: "₽9.00 / 1k tokens", outputRate: "₽12.00 / 1k tokens" },
        { model: "Claude Sonnet 4.5", inputRate: "₽1.80 / 1k tokens", outputRate: "₽2.40 / 1k tokens" },
        { model: "Gemini 2.5 Pro", inputRate: "₽0.75 / 1k tokens", outputRate: "₽1.50 / 1k tokens" },
        { model: "Embeddings", inputRate: "₽0.05 / 1k tokens", outputRate: "-" },
    ]

    return (
        <div className="space-y-6">
            {/* Current Plan */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle>Pay-As-You-Go Plan</CardTitle>
                            <CardDescription>Active billing plan</CardDescription>
                        </div>
                        <Badge variant="default" className="gap-1">
                            <CheckCircle2 className="h-3 w-3" />
                            Active
                        </Badge>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Current balance</span>
                            <span className="font-semibold tabular-nums">₽ 1,250</span>
                        </div>
                        <Progress value={62} className="h-2" />
                        <p className="text-xs text-muted-foreground">
                            Renews when balance is below ₽500 (if auto-refill enabled)
                        </p>
                    </div>
                </CardContent>
            </Card>

            {/* Model Rates */}
            <Card>
                <CardHeader>
                    <CardTitle>Model Rates & Pricing</CardTitle>
                    <CardDescription>
                        Transparent unit economics for each AI model
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Accordion type="single" collapsible className="w-full">
                        <AccordionItem value="rates">
                            <AccordionTrigger>View Rate Card</AccordionTrigger>
                            <AccordionContent>
                                <div className="space-y-3">
                                    {modelRates.map((rate) => (
                                        <div
                                            key={rate.model}
                                            className="flex items-center justify-between rounded-lg border p-3"
                                        >
                                            <div>
                                                <p className="font-medium">{rate.model}</p>
                                                <div className="mt-1 flex gap-4 text-xs text-muted-foreground">
                                                    <span>Input: {rate.inputRate}</span>
                                                    {rate.outputRate !== "-" && (
                                                        <span>Output: {rate.outputRate}</span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </AccordionContent>
                        </AccordionItem>
                    </Accordion>
                </CardContent>
            </Card>

            {/* Payment Methods */}
            <Card>
                <CardHeader>
                    <CardTitle>Payment Methods</CardTitle>
                    <CardDescription>Manage your billing preferences</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center justify-between rounded-lg border p-4">
                        <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                                <CreditCard className="h-5 w-5" />
                            </div>
                            <div>
                                <p className="font-medium">Visa ending in 4242</p>
                                <p className="text-sm text-muted-foreground">Expires 12/25</p>
                            </div>
                        </div>
                        <Badge variant="secondary">Default</Badge>
                    </div>

                    <div className="flex items-center justify-between rounded-lg border border-dashed p-4">
                        <div>
                            <Label htmlFor="auto-refill" className="font-medium">
                                Auto-refill when below ₽500
                            </Label>
                            <p className="text-sm text-muted-foreground">
                                Automatically top up with ₽1,000 when balance is low
                            </p>
                        </div>
                        <Switch id="auto-refill" />
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}

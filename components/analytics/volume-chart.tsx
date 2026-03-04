"use client"

import {
    Bar,
    BarChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
    CartesianGrid
} from "recharts"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { mockVolumeData } from "@/mocks/analytics"

export function VolumeChart() {
    return (
        <Card className="col-span-4 border border-border shadow-[0_2px_8px_rgba(0,0,0,0.04)] bg-card rounded-2xl">
            <CardHeader className="pb-2">
                <CardTitle className="text-lg font-bold text-foreground">Conversation Volume</CardTitle>
                <CardDescription className="text-muted-foreground font-medium">
                    Daily session traffic over the last 14 days.
                </CardDescription>
            </CardHeader>
            <CardContent className="pl-0 pr-2 pt-6">
                <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={mockVolumeData}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f4f4f5" />
                            <XAxis
                                dataKey="date"
                                stroke="#a1a1aa"
                                fontSize={12}
                                tickLine={false}
                                axisLine={false}
                                dy={10}
                            />
                            <YAxis
                                stroke="#a1a1aa"
                                fontSize={12}
                                tickLine={false}
                                axisLine={false}
                                dx={-10}
                            />
                            <Tooltip
                                contentStyle={{ backgroundColor: '#fff', borderColor: '#e4e4e7', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}
                                itemStyle={{ color: '#18181b', fontWeight: 600 }}
                                cursor={{ fill: '#f4f4f5' }}
                            />
                            <Bar
                                dataKey="volume"
                                fill="#18181b"
                                radius={[4, 4, 0, 0]}
                                barSize={32}
                            />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    )
}

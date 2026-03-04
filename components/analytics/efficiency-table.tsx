"use client"

import { Star } from "lucide-react"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { mockAgentStats } from "@/mocks/analytics"

export function EfficiencyTable() {
    return (
        <Card className="border border-border shadow-[0_2px_8px_rgba(0,0,0,0.04)] bg-card rounded-2xl overflow-hidden">
            <CardHeader className="pb-3 px-6 pt-6">
                <CardTitle className="text-base font-semibold tracking-tight text-foreground">Agent Efficiency</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
                <Table>
                    <TableHeader>
                        <TableRow className="hover:bg-transparent border-b border-border">
                            <TableHead className="w-[200px] uppercase tracking-wider text-[11px] font-semibold text-muted-foreground pl-6 h-10">Agent</TableHead>
                            <TableHead className="uppercase tracking-wider text-[11px] font-semibold text-muted-foreground h-10">Sessions</TableHead>
                            <TableHead className="uppercase tracking-wider text-[11px] font-semibold text-muted-foreground h-10">Avg. Duration</TableHead>
                            <TableHead className="uppercase tracking-wider text-[11px] font-semibold text-muted-foreground h-10">CSAT Score</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {mockAgentStats.map((agent) => (
                            <TableRow key={agent.id} className="h-14 border-b border-zinc-50 hover:bg-muted/50/80 transition-colors">
                                <TableCell className="font-medium pl-6">
                                    <div className="flex items-center gap-3">
                                        <Avatar className="h-8 w-8 border border-border dark:border-zinc-800">
                                            <AvatarImage src={`/avatars/${agent.id}.png`} />
                                            <AvatarFallback className="text-[10px] bg-muted text-muted-foreground font-medium">{agent.name.charAt(0)}</AvatarFallback>
                                        </Avatar>
                                        <span className="text-sm font-medium text-foreground">{agent.name}</span>
                                    </div>
                                </TableCell>
                                <TableCell className="tabular-nums text-sm text-muted-foreground">{agent.sessions}</TableCell>
                                <TableCell className="tabular-nums text-sm text-muted-foreground">{agent.avgDuration}</TableCell>
                                <TableCell>
                                    <div className="flex items-center gap-1.5 font-medium tabular-nums text-sm text-foreground">
                                        {agent.csat}
                                        <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    )
}

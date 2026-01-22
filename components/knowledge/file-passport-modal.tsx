"use client"

import * as React from "react"
import { Lightbulb, X, Tag, FileText } from "lucide-react"

import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { type AIMetadata } from "@/mocks/documents"

interface FilePassportModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    filename: string;
    metadata: AIMetadata | null;
}

export function FilePassportModal({
    open,
    onOpenChange,
    filename,
    metadata
}: FilePassportModalProps) {
    if (!metadata) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-lg p-0 gap-0 overflow-hidden rounded-2xl">
                {/* Header */}
                <div className="bg-gradient-to-br from-zinc-900 to-zinc-800 p-6 text-white">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-bold tracking-tight">
                            {metadata.ai_title}
                        </DialogTitle>
                        <div className="flex items-center gap-2 mt-2">
                            <span className="text-zinc-400 text-sm truncate max-w-[200px]">
                                {filename}
                            </span>
                            <span className="text-zinc-600">•</span>
                            <Badge
                                variant="secondary"
                                className="bg-white/10 text-white border-white/20 hover:bg-white/20"
                            >
                                {metadata.category}
                            </Badge>
                        </div>
                    </DialogHeader>
                </div>

                {/* Content */}
                <div className="p-6 space-y-5">
                    {/* Summary Section */}
                    <div className="space-y-2">
                        <div className="flex items-center gap-2 text-zinc-500">
                            <FileText className="h-4 w-4" />
                            <span className="text-xs font-semibold uppercase tracking-wider">О чем этот файл</span>
                        </div>
                        <p className="text-zinc-700 leading-relaxed">
                            {metadata.summary}
                        </p>
                    </div>

                    {/* Utility Section */}
                    <div className="space-y-2">
                        <div className="flex items-center gap-2 text-amber-600">
                            <Lightbulb className="h-4 w-4" />
                            <span className="text-xs font-semibold uppercase tracking-wider">Чем полезен</span>
                        </div>
                        <div className="bg-amber-50 border border-amber-100 rounded-xl p-4">
                            <p className="text-amber-900 text-sm leading-relaxed">
                                {metadata.utility}
                            </p>
                        </div>
                    </div>

                    {/* Topics Section */}
                    <div className="space-y-2">
                        <div className="flex items-center gap-2 text-zinc-500">
                            <Tag className="h-4 w-4" />
                            <span className="text-xs font-semibold uppercase tracking-wider">Темы</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {metadata.topics.map((topic, index) => (
                                <Badge
                                    key={index}
                                    variant="outline"
                                    className="bg-zinc-50 border-zinc-200 text-zinc-700 hover:bg-zinc-100 rounded-lg px-3 py-1"
                                >
                                    {topic}
                                </Badge>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="border-t border-zinc-100 p-4 bg-zinc-50/50">
                    <Button
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        className="w-full rounded-xl"
                    >
                        Закрыть
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    )
}

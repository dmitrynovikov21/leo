"use client"

import * as React from "react"
import { X, Search, Save, FileText } from "lucide-react"
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"

interface Chunk {
    id: string
    content: string
    metadata: {
        page?: number
        source: string
    }
}

interface ChunkInspectorProps {
    documentId: string
    documentName: string
    chunks: Chunk[]
    open: boolean
    onOpenChange: (open: boolean) => void
}

export function ChunkInspector({
    documentId,
    documentName,
    chunks,
    open,
    onOpenChange,
}: ChunkInspectorProps) {
    const [searchQuery, setSearchQuery] = React.useState("")
    const [selectedChunk, setSelectedChunk] = React.useState<Chunk | null>(null)
    const [editedContent, setEditedContent] = React.useState("")

    const filteredChunks = chunks.filter((chunk) =>
        chunk.content.toLowerCase().includes(searchQuery.toLowerCase())
    )

    const handleChunkSelect = (chunk: Chunk) => {
        setSelectedChunk(chunk)
        setEditedContent(chunk.content)
    }

    const handleSave = () => {
        // TODO: API call to update chunk
        console.log("Saving chunk:", { documentId, chunkId: selectedChunk?.id, content: editedContent })
        setSelectedChunk(null)
    }

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent side="right" className="w-full sm:max-w-2xl p-0 flex flex-col">
                <SheetHeader className="p-6 pb-4">
                    <SheetTitle>Инспектор контента документа</SheetTitle>
                    <SheetDescription>{documentName}</SheetDescription>
                </SheetHeader>

                <div className="px-6 pb-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            placeholder="Поиск по чанкам..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10"
                        />
                    </div>
                </div>

                <Separator />

                {selectedChunk ? (
                    // Edit View
                    <div className="flex flex-1 flex-col p-6 overflow-hidden">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h4 className="font-semibold">Редактирование чанка {selectedChunk.id}</h4>
                                <p className="text-sm text-muted-foreground">
                                    {selectedChunk.metadata.source}
                                    {selectedChunk.metadata.page && ` • Страница ${selectedChunk.metadata.page}`}
                                </p>
                            </div>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setSelectedChunk(null)}
                            >
                                <X className="h-4 w-4" />
                            </Button>
                        </div>

                        <Textarea
                            value={editedContent}
                            onChange={(e) => setEditedContent(e.target.value)}
                            className="flex-1 font-mono text-sm min-h-[400px]"
                        />

                        <div className="flex gap-2 mt-4">
                            <Button onClick={handleSave} className="flex-1">
                                <Save className="mr-2 h-4 w-4" />
                                Сохранить изменения
                            </Button>
                            <Button
                                variant="outline"
                                onClick={() => setEditedContent(selectedChunk.content)}
                            >
                                Сбросить
                            </Button>
                        </div>
                    </div>
                ) : (
                    // List View
                    <ScrollArea className="flex-1">
                        <div className="p-6 space-y-3">
                            <div className="flex items-center justify-between mb-4">
                                <p className="text-sm text-muted-foreground">
                                    {filteredChunks.length} сегментов найдено
                                </p>
                            </div>

                            {filteredChunks.map((chunk) => (
                                <div
                                    key={chunk.id}
                                    className="group cursor-pointer rounded-lg border p-4 hover:bg-muted/50 transition-colors"
                                    onClick={() => handleChunkSelect(chunk)}
                                >
                                    <div className="flex items-start justify-between gap-3 mb-2">
                                        <div className="flex items-center gap-2">
                                            <FileText className="h-4 w-4 text-muted-foreground" />
                                            <span className="text-xs font-medium text-muted-foreground">
                                                Чанк {chunk.id}
                                            </span>
                                        </div>
                                        {chunk.metadata.page && (
                                            <Badge variant="outline" className="text-xs">
                                                Стр. {chunk.metadata.page}
                                            </Badge>
                                        )}
                                    </div>
                                    <p className="text-sm line-clamp-3 text-muted-foreground">
                                        {chunk.content}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </ScrollArea>
                )}
            </SheetContent>
        </Sheet>
    )
}

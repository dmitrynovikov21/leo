"use client"

import * as React from "react"
import { useTranslations } from "next-intl"
import { Search, MessageCircle } from "lucide-react"

import { Input } from "@/components/ui/input"
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { TooltipProvider } from "@/components/ui/tooltip"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

import { ChatThreadView } from "@/components/inbox/chat-thread-view"
import { mockChats } from "@/mocks/inbox"

export function InboxLayout() {
    const t = useTranslations('Inbox');

    const [selectedChatId, setSelectedChatId] = React.useState<string | null>("1")
    const [isCollapsed, setIsCollapsed] = React.useState(false)

    const selectedChat = mockChats.find(c => c.id === selectedChatId)

    return (
        <TooltipProvider delayDuration={0}>
            <div className="h-full min-h-[600px] overflow-hidden bg-white rounded-2xl border border-zinc-200/50 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
                <ResizablePanelGroup
                    direction="horizontal"
                    onLayout={(sizes: number[]) => {
                        const sidebarSize = sizes[0]
                        if (sidebarSize < 15) {
                            setIsCollapsed(true)
                        } else {
                            setIsCollapsed(false)
                        }
                    }}
                >
                    {/* SIDEBAR: Chat List */}
                    <ResizablePanel
                        defaultSize={25}
                        maxSize={40}
                        minSize={15}
                        collapsible={true}
                        onCollapse={() => setIsCollapsed(true)}
                        onExpand={() => setIsCollapsed(false)}
                        className={cn(isCollapsed && "min-w-[50px] transition-all duration-300 ease-in-out", "bg-white")}
                    >
                        <div className="flex flex-col h-full border-r border-zinc-100">
                            <div className={cn("flex items-center justify-center p-4", isCollapsed ? "h-[68px]" : "")}>
                                {isCollapsed ? (
                                    <MessageCircle className="h-6 w-6 text-zinc-400" />
                                ) : (
                                    <div className="relative w-full">
                                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
                                        <Input
                                            placeholder={t('searchMessages')}
                                            className="pl-9 h-10 rounded-xl border-transparent bg-zinc-100/50 focus:bg-white focus:ring-2 focus:ring-zinc-200 transition-all font-medium text-zinc-900 placeholder:text-zinc-400"
                                        />
                                    </div>
                                )}
                            </div>

                            <Tabs defaultValue="all" className="flex-1 flex flex-col">
                                {!isCollapsed && (
                                    <div className="px-4 pb-4">
                                        <TabsList className="w-full bg-zinc-100/50 rounded-xl p-1 h-9">
                                            <TabsTrigger value="all" className="flex-1 rounded-lg text-xs font-medium data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-zinc-900 text-zinc-500">{t('all')}</TabsTrigger>
                                            <TabsTrigger value="unread" className="flex-1 rounded-lg text-xs font-medium data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-zinc-900 text-zinc-500">{t('unread')}</TabsTrigger>
                                            <TabsTrigger value="mentions" className="flex-1 rounded-lg text-xs font-medium data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-zinc-900 text-zinc-500">{t('mentions')}</TabsTrigger>
                                        </TabsList>
                                    </div>
                                )}

                                <ScrollArea className="flex-1">
                                    <div className="flex flex-col gap-1 p-2 pt-0">
                                        {mockChats.map((chat) => (
                                            <button
                                                key={chat.id}
                                                className={cn(
                                                    "flex flex-col items-start gap-2 rounded-xl p-3 text-left text-sm transition-all border border-transparent",
                                                    selectedChatId === chat.id
                                                        ? "bg-zinc-50 border-zinc-200/50 shadow-sm"
                                                        : "hover:bg-zinc-50 hover:border-zinc-100/50"
                                                )}
                                                onClick={() => setSelectedChatId(chat.id)}
                                            >
                                                <div className="flex w-full flex-col gap-1">
                                                    <div className="flex items-center">
                                                        <div className="flex items-center gap-3">
                                                            <Avatar className="h-10 w-10 border border-zinc-100">
                                                                <AvatarImage src={chat.avatar} alt={chat.name} />
                                                                <AvatarFallback className="bg-zinc-100 text-zinc-500 font-medium">{chat.name[0]}</AvatarFallback>
                                                            </Avatar>
                                                            {!isCollapsed && (
                                                                <div className="font-semibold text-zinc-900">{chat.name}</div>
                                                            )}
                                                        </div>
                                                        <div
                                                            className={cn(
                                                                "ml-auto text-xs font-medium",
                                                                selectedChatId === chat.id
                                                                    ? "text-zinc-500"
                                                                    : "text-zinc-400"
                                                            )}
                                                        >
                                                            {chat.time}
                                                        </div>
                                                    </div>

                                                    {!isCollapsed && (
                                                        <>
                                                            <div className="line-clamp-2 text-xs text-zinc-500 mt-1 pl-[52px]">
                                                                {chat.lastMessage}
                                                            </div>
                                                            <div className="flex items-center gap-2 mt-2 pl-[52px]">
                                                                <Badge variant="outline" className={cn(
                                                                    "px-1.5 py-0.5 text-[10px] uppercase font-semibold tracking-wide rounded-md border",
                                                                    chat.channel === "telegram" && "border-blue-100 bg-blue-50/50 text-blue-600",
                                                                    chat.channel === "whatsapp" && "border-green-100 bg-green-50/50 text-green-600",
                                                                )}>
                                                                    {chat.channel}
                                                                </Badge>
                                                                {chat.sentiment === "negative" && (
                                                                    <Badge variant="destructive" className="px-1.5 py-0.5 text-[10px] bg-red-50 text-red-600 border border-red-100 hover:bg-red-100 shadow-none rounded-md font-medium">{t('negativeSentiment')}</Badge>
                                                                )}
                                                            </div>
                                                        </>
                                                    )}
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </ScrollArea>
                            </Tabs>
                        </div>
                    </ResizablePanel>

                    <ResizableHandle withHandle className="bg-zinc-50 border-none" />

                    {/* MAIN: Chat View */}
                    <ResizablePanel defaultSize={75} className="bg-white">
                        {selectedChat ? (
                            <ChatThreadView chat={selectedChat} />
                        ) : (
                            <div className="m-auto flex h-full items-center justify-center p-8 text-zinc-400 font-medium">
                                {t('selectConversation')}
                            </div>
                        )}
                    </ResizablePanel>
                </ResizablePanelGroup>
            </div>
        </TooltipProvider>
    )
}

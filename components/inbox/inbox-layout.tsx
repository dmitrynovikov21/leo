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
            <div className="h-full min-h-[600px] overflow-hidden bg-card rounded-2xl border border-border shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
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
                        className={cn(isCollapsed && "min-w-[50px] transition-all duration-300 ease-in-out", "bg-card")}
                    >
                        <div className="flex flex-col h-full border-r border-border">
                            <div className={cn("flex items-center justify-center p-4", isCollapsed ? "h-[68px]" : "")}>
                                {isCollapsed ? (
                                    <MessageCircle className="h-6 w-6 text-muted-foreground" />
                                ) : (
                                    <div className="relative w-full">
                                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            placeholder={t('searchMessages')}
                                            className="pl-9 h-10 rounded-xl border-transparent bg-muted/50 focus:bg-card focus:ring-2 focus:ring-ring transition-all font-medium text-foreground placeholder:text-muted-foreground"
                                        />
                                    </div>
                                )}
                            </div>

                            <Tabs defaultValue="all" className="flex-1 flex flex-col">
                                {!isCollapsed && (
                                    <div className="px-4 pb-4">
                                        <TabsList className="w-full bg-muted/50 rounded-xl p-1 h-9">
                                            <TabsTrigger value="all" className="flex-1 rounded-lg text-xs font-medium data-[state=active]:bg-card data-[state=active]:shadow-sm data-[state=active]:text-foreground text-muted-foreground">{t('all')}</TabsTrigger>
                                            <TabsTrigger value="unread" className="flex-1 rounded-lg text-xs font-medium data-[state=active]:bg-card data-[state=active]:shadow-sm data-[state=active]:text-foreground text-muted-foreground">{t('unread')}</TabsTrigger>
                                            <TabsTrigger value="mentions" className="flex-1 rounded-lg text-xs font-medium data-[state=active]:bg-card data-[state=active]:shadow-sm data-[state=active]:text-foreground text-muted-foreground">{t('mentions')}</TabsTrigger>
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
                                                        ? "bg-muted/50 border-border shadow-sm"
                                                        : "hover:bg-muted/50 hover:border-border"
                                                )}
                                                onClick={() => setSelectedChatId(chat.id)}
                                            >
                                                <div className="flex w-full flex-col gap-1">
                                                    <div className="flex items-center">
                                                        <div className="flex items-center gap-3">
                                                            <Avatar className="h-10 w-10 border border-border">
                                                                <AvatarImage src={chat.avatar} alt={chat.name} />
                                                                <AvatarFallback className="bg-muted text-muted-foreground font-medium">{chat.name[0]}</AvatarFallback>
                                                            </Avatar>
                                                            {!isCollapsed && (
                                                                <div className="font-semibold text-foreground">{chat.name}</div>
                                                            )}
                                                        </div>
                                                        <div
                                                            className={cn(
                                                                "ml-auto text-xs font-medium",
                                                                selectedChatId === chat.id
                                                                    ? "text-muted-foreground"
                                                                    : "text-muted-foreground"
                                                            )}
                                                        >
                                                            {chat.time}
                                                        </div>
                                                    </div>

                                                    {!isCollapsed && (
                                                        <>
                                                            <div className="line-clamp-2 text-xs text-muted-foreground mt-1 pl-[52px]">
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

                    <ResizableHandle withHandle className="bg-muted/50 border-none" />

                    {/* MAIN: Chat View */}
                    <ResizablePanel defaultSize={75} className="bg-card">
                        {selectedChat ? (
                            <ChatThreadView chat={selectedChat} />
                        ) : (
                            <div className="m-auto flex h-full items-center justify-center p-8 text-muted-foreground font-medium">
                                {t('selectConversation')}
                            </div>
                        )}
                    </ResizablePanel>
                </ResizablePanelGroup>
            </div>
        </TooltipProvider>
    )
}

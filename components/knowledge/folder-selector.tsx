"use client"

import * as React from "react"
import { Check, ChevronsUpDown, Folder, Bot, Globe } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
    CommandSeparator,
} from "@/components/ui/command"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { EmojiAvatar } from "@/components/shared/emoji-avatar"

interface FolderSelectorProps {
    value: string
    onValueChange: (value: string) => void
    agents: { id: string, name: string }[]
}

export function FolderSelector({ value, onValueChange, agents }: FolderSelectorProps) {
    const [open, setOpen] = React.useState(false)

    // Current selected label
    const selectedAgent = agents.find(a => a.id === value)
    const isGlobal = value === 'global'

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className="w-[280px] justify-between text-base font-medium border-0 shadow-sm bg-muted/20 hover:bg-muted/30 px-3 h-11"
                >
                    <div className="flex items-center gap-2 overflow-hidden">
                        <div className={cn(
                            "flex items-center justify-center w-6 h-6 rounded bg-background/50 text-muted-foreground",
                            isGlobal ? "text-blue-500" : "text-violet-500"
                        )}>
                            {isGlobal ? <Globe className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                        </div>
                        <span className="truncate">
                            {isGlobal ? "Общая база знаний" : (selectedAgent?.name || "Неизвестный агент")}
                        </span>
                    </div>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[280px] p-0" align="start">
                <Command>
                    <CommandInput placeholder="Найти папку..." />
                    <CommandList>
                        <CommandEmpty>Папка не найдена.</CommandEmpty>
                        <CommandGroup heading="Основное">
                            <CommandItem
                                value="global kb general"
                                disabled={false}
                                className="data-[disabled]:pointer-events-auto data-[disabled]:opacity-100"
                                onSelect={() => {
                                    onValueChange("global")
                                    setOpen(false)
                                }}
                            >
                                <Check
                                    className={cn(
                                        "mr-2 h-4 w-4",
                                        isGlobal ? "opacity-100" : "opacity-0"
                                    )}
                                />
                                <div className="mr-2 flex h-6 w-6 items-center justify-center rounded bg-blue-50 text-blue-500">
                                    <Globe className="h-4 w-4" />
                                </div>
                                Общая база знаний
                            </CommandItem>
                        </CommandGroup>
                        <CommandSeparator />
                        <CommandGroup heading="Агенты (Папки)">
                            {agents.map((agent) => (
                                <CommandItem
                                    key={agent.id}
                                    value={`${agent.name} ${agent.id}`}
                                    keywords={[agent.name]}
                                    disabled={false}
                                    className="data-[disabled]:pointer-events-auto data-[disabled]:opacity-100"
                                    onSelect={() => {
                                        console.log("Selected agent:", agent.id)
                                        onValueChange(agent.id)
                                        setOpen(false)
                                    }}
                                >
                                    <Check
                                        className={cn(
                                            "mr-2 h-4 w-4",
                                            value === agent.id ? "opacity-100" : "opacity-0"
                                        )}
                                    />
                                    <div className="mr-2 flex h-6 w-6 items-center justify-center rounded bg-violet-50 text-violet-500">
                                        <Bot className="h-4 w-4" />
                                    </div>
                                    <span className="truncate">{agent.name}</span>
                                </CommandItem>
                            ))}
                            {agents.length === 0 && (
                                <div className="py-2 px-2 text-xs text-muted-foreground text-center">
                                    Нет созданных агентов
                                </div>
                            )}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    )
}

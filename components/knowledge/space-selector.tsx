"use client"

import * as React from "react"
import { Check, ChevronsUpDown, Plus } from "lucide-react"
import { toast } from "sonner"

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
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

import { EmojiAvatar } from "@/components/shared/emoji-avatar"
import { Folder } from "lucide-react"

const spaces = [
    {
        value: "desktop",
        label: "Рабочий стол",
    },
    {
        value: "tech-support",
        label: "Техподдержка",
    },
    {
        value: "sales",
        label: "Продажи",
    },
]

interface SpaceSelectorProps {
    value?: string
    onValueChange?: (value: string) => void
    additionalSpaces?: { value: string; label: string }[]
}

export function SpaceSelector({ value: controlledValue, onValueChange, additionalSpaces = [] }: SpaceSelectorProps) {
    const [open, setOpen] = React.useState(false)
    const [internalValue, setInternalValue] = React.useState("desktop")

    const value = controlledValue || internalValue
    const setValue = onValueChange || setInternalValue

    // Combine default spaces with additional dynamic spaces (folders)
    const allSpaces = [
        ...spaces,
        {
            value: "separator",
            label: "---"
        },
        ...additionalSpaces
    ].filter(s => s.value !== "separator" || additionalSpaces.length > 0)

    // ... 

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className="w-[240px] justify-between text-base font-medium border-0 shadow-sm bg-muted/20 hover:bg-muted/30 px-3"
                >
                    <div className="flex items-center gap-2 overflow-hidden">
                        <EmojiAvatar
                            value={
                                value === 'desktop' ? '📁' :
                                    additionalSpaces.find(s => s.value === value)?.label ? '📁' :
                                        '📁' // Default folder for now, until we have real emoji for spaces
                            }
                            fallbackIcon={Folder}
                            size="sm"
                            className="bg-transparent"
                        />
                        <span className="truncate">
                            {value
                                ? allSpaces.find((space) => space.value === value)?.label || spaces.find(s => s.value === 'desktop')?.label
                                : "Выберите пространство..."}
                        </span>
                    </div>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[240px] p-0">
                <Command>
                    <CommandInput placeholder="Найти пространство..." />
                    <CommandList>
                        <CommandEmpty>Пространство не найдено.</CommandEmpty>
                        <CommandGroup heading="Пространства">
                            {spaces.map((space) => (
                                <CommandItem
                                    key={space.value}
                                    value={space.value}
                                    onSelect={(currentValue) => {
                                        setValue(space.value)
                                        setOpen(false)
                                    }}
                                >
                                    <Check
                                        className={cn(
                                            "mr-2 h-4 w-4",
                                            value === space.value ? "opacity-100" : "opacity-0"
                                        )}
                                    />
                                    <EmojiAvatar value="📁" size="sm" className="mr-2 h-6 w-6 text-sm bg-transparent" />
                                    {space.label}
                                </CommandItem>
                            ))}
                        </CommandGroup>
                        {additionalSpaces.length > 0 && (
                            <>
                                <CommandSeparator />
                                <CommandGroup heading="Папки">
                                    {additionalSpaces.map((space) => (
                                        <CommandItem
                                            key={space.value}
                                            value={space.value}
                                            onSelect={(currentValue) => {
                                                setValue(space.value)
                                                setOpen(false)
                                            }}
                                        >
                                            <Check
                                                className={cn(
                                                    "mr-2 h-4 w-4",
                                                    value === space.value ? "opacity-100" : "opacity-0"
                                                )}
                                            />
                                            <EmojiAvatar value="📁" size="sm" className="mr-2 h-6 w-6 text-sm bg-transparent" />
                                            {space.label}
                                        </CommandItem>
                                    ))}
                                </CommandGroup>
                            </>
                        )}
                        <CommandSeparator />
                        <CommandGroup>
                            <Dialog>
                                <DialogTrigger asChild>
                                    <CommandItem onSelect={() => toast("Скоро будет доступно", { description: "Функция создания пространств в разработке" })} className="cursor-pointer">
                                        <Plus className="mr-2 h-4 w-4" />
                                        Создать пространство (Скоро)
                                    </CommandItem>
                                </DialogTrigger>
                                {/* ... dialog content ... */}
                            </Dialog>
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    )
}

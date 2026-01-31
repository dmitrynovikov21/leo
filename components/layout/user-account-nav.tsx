"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ChevronsUpDown, LogOut, Moon, Settings, Sun, User } from "lucide-react";
import { EmojiAvatar } from "@/components/shared/emoji-avatar";
import { signOut, useSession } from "next-auth/react";
import { useLocale } from "next-intl";
import { useTheme } from "next-themes";
import { Drawer } from "vaul";

import { useMediaQuery } from "@/hooks/use-media-query";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuPortal,
} from "@/components/ui/dropdown-menu";

import { useUserPreferences } from "@/components/providers/user-preferences-provider";
import { useUserData } from "@/components/providers/user-data-provider";

interface UserAccountNavProps {
  side?: "top" | "bottom" | "left" | "right";
  align?: "start" | "center" | "end";
  collapsed?: boolean;
}



export function UserAccountNav({ side = "bottom", align = "end", collapsed }: UserAccountNavProps) {
  const router = useRouter();
  const pathname = usePathname(); // Remove if unused
  const locale = useLocale();
  const { setTheme, theme } = useTheme();
  const { data: session } = useSession();
  const { userData } = useUserData();
  const { avatar } = useUserPreferences();

  const user = session?.user ? {
    name: session.user.name,
    email: session.user.email,
    role: (session.user as any).role,
    image: session.user.image
  } : null;

  const [open, setOpen] = useState(false);
  const closeMenu = () => setOpen(false);

  const { isMobile } = useMediaQuery();



  const getPlanLabel = () => {
    const plan = userData?.profile?.plan;
    if (plan === 'pro') return 'Pro план';
    if (plan === 'business') return 'Business план';
    return 'Free план';
  };

  const handleLogout = () => {
    closeMenu();
    signOut({ callbackUrl: `/${locale}/login` });
  };

  // Mobile View
  if (isMobile) {
    return (
      <Drawer.Root open={open} onOpenChange={setOpen}>
        <Drawer.Trigger onClick={() => setOpen(true)} className="w-full">
          <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted w-full cursor-pointer">
            <EmojiAvatar value={avatar} fallbackIcon={User} className="size-9 border" />
            <div className="flex-1 text-left">
              <p className="text-sm font-medium truncate">{user?.name || 'Пользователь'}</p>
              <p className="text-xs text-muted-foreground">{getPlanLabel()}</p>
            </div>
            <ChevronsUpDown className="size-4 text-muted-foreground" />
          </div>
        </Drawer.Trigger>
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 z-40 h-full bg-background/80 backdrop-blur-sm" onClick={closeMenu} />
          <Drawer.Content className="fixed inset-x-0 bottom-0 z-50 mt-24 overflow-hidden rounded-t-[10px] border bg-background px-3 text-sm">
            <div className="sticky top-0 z-20 flex w-full items-center justify-center bg-inherit">
              <div className="my-3 h-1.5 w-16 rounded-full bg-muted-foreground/20" />
            </div>

            <div className="flex items-center gap-3 p-2">
              <EmojiAvatar value={avatar} fallbackIcon={User} className="size-10 border" />
              <div>
                <p className="font-medium">{user?.name || 'Пользователь'}</p>
                <p className="text-xs text-muted-foreground">{getPlanLabel()}</p>
              </div>
            </div>

            <ul role="list" className="mb-14 mt-1 w-full text-muted-foreground">
              <li className="rounded-lg text-foreground hover:bg-muted">
                <Link href="/dashboard/settings" onClick={closeMenu} className="flex w-full items-center gap-3 px-2.5 py-2">
                  <Settings className="size-4" />
                  <span className="text-sm">Настройки</span>
                </Link>
              </li>

              <li className="rounded-lg text-foreground hover:bg-muted cursor-pointer" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
                <div className="flex w-full items-center gap-3 px-2.5 py-2">
                  <Sun className="size-4" />
                  <span className="text-sm">Тема</span>
                  <span className="ml-auto text-xs text-muted-foreground">{theme === 'dark' ? 'Тёмная' : 'Светлая'}</span>
                </div>
              </li>



              <li className="rounded-lg text-foreground hover:bg-muted cursor-pointer" onClick={handleLogout}>
                <div className="flex w-full items-center gap-3 px-2.5 py-2">
                  <LogOut className="size-4" />
                  <span className="text-sm">Выйти</span>
                </div>
              </li>
            </ul>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>
    );
  }

  // Desktop View
  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        {collapsed ? (
          <div className="flex items-center justify-center w-full p-2 rounded-lg hover:bg-muted cursor-pointer group">
            <EmojiAvatar value={avatar} fallbackIcon={User} className="size-8 group-hover:scale-105 transition-transform" />
          </div>
        ) : (
          <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted w-full cursor-pointer">
            <EmojiAvatar value={avatar} fallbackIcon={User} className="size-8" />
            <div className="flex-1 text-left min-w-0">
              <p className="text-sm font-medium truncate">{user?.name || 'Пользователь'}</p>
              <p className="text-xs text-muted-foreground">{getPlanLabel()}</p>
            </div>
            <ChevronsUpDown className="size-4 text-muted-foreground shrink-0" />
          </div>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align} side={side} sideOffset={10} className="w-56">
        <div className="flex items-center gap-3 p-2">
          <EmojiAvatar value={avatar} fallbackIcon={User} className="size-9" />
          <div className="flex-1 min-w-0">
            <p className="font-medium truncate">{user?.name || 'Пользователь'}</p>
            <p className="text-xs text-muted-foreground">{getPlanLabel()}</p>
          </div>
        </div>
        <DropdownMenuSeparator />

        <DropdownMenuItem asChild>
          <Link href="/dashboard/settings" className="flex items-center gap-2 cursor-pointer">
            <Settings className="size-4" />
            <span>Настройки</span>
          </Link>
        </DropdownMenuItem>

        {/* Theme submenu */}
        <DropdownMenuSub>
          <DropdownMenuSubTrigger className="cursor-pointer">
            <Sun className="size-4 mr-2" />
            <span>Тема</span>
          </DropdownMenuSubTrigger>
          <DropdownMenuPortal>
            <DropdownMenuSubContent>
              <DropdownMenuItem onSelect={() => setTheme("light")} className="cursor-pointer">
                <Sun className="size-4 mr-2" />
                <span>Светлая</span>
                {theme === 'light' && <span className="ml-auto">✓</span>}
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setTheme("dark")} className="cursor-pointer">
                <Moon className="size-4 mr-2" />
                <span>Тёмная</span>
                {theme === 'dark' && <span className="ml-auto">✓</span>}
              </DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuPortal>
        </DropdownMenuSub>



        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={handleLogout} className="cursor-pointer text-destructive focus:text-destructive">
          <LogOut className="size-4 mr-2" />
          <span>Выйти</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

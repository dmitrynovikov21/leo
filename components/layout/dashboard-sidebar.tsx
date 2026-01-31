"use client";

import { useTranslations } from "next-intl";
import { Fragment, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { NavItem, SidebarNavItem } from "@/types";
import { Menu, PanelLeftClose, PanelRightClose, LogOut } from "lucide-react";

import { siteConfig } from "@/config/site";
import { cn } from "@/lib/utils";
import { useMediaQuery } from "@/hooks/use-media-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import ProjectSwitcher from "@/components/dashboard/project-switcher";
import { UpgradeCard } from "@/components/dashboard/upgrade-card";
import { BalanceWidget } from "@/components/dashboard/balance-widget";
import { Icons } from "@/components/shared/icons";
import { UserAccountNav } from "@/components/layout/user-account-nav";

interface DashboardSidebarProps {
  links: SidebarNavItem[];
}

export function DashboardSidebar({ links }: DashboardSidebarProps) {
  const router = useRouter();
  const path = usePathname();
  const t = useTranslations(); // Move hook to component level

  // NOTE: Use this if you want save in local storage -- Credits: Hosna Qasmei
  //
  // const [isSidebarExpanded, setIsSidebarExpanded] = useState(() => {
  //   if (typeof window !== "undefined") {
  //     const saved = window.localStorage.getItem("sidebarExpanded");
  //     return saved !== null ? JSON.parse(saved) : true;
  //   }
  //   return true;
  // });

  // useEffect(() => {
  //   if (typeof window !== "undefined") {
  //     window.localStorage.setItem(
  //       "sidebarExpanded",
  //       JSON.stringify(isSidebarExpanded),
  //     );
  //   }
  // }, [isSidebarExpanded]);

  const { isTablet } = useMediaQuery();
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(!isTablet);

  const toggleSidebar = () => {
    setIsSidebarExpanded(!isSidebarExpanded);
  };

  useEffect(() => {
    setIsSidebarExpanded(!isTablet);
  }, [isTablet]);

  return (
    <TooltipProvider delayDuration={0}>
      <div className="sticky top-0 h-full">
        <ScrollArea className="h-full overflow-y-auto border-r">
          <aside
            className={cn(
              isSidebarExpanded ? "w-[220px] xl:w-[260px]" : "w-[68px]",
              "hidden h-screen md:block",
            )}
          >
            <div className="flex h-full max-h-screen flex-1 flex-col gap-2">
              <div className="flex h-14 items-center p-4 lg:h-[60px]">
                {isSidebarExpanded ? (
                  <Link href="/dashboard" className="flex items-center gap-2">
                    <span className="text-2xl font-black tracking-tighter text-primary">LEO | AGENT&apos;S</span>
                  </Link>
                ) : (
                  <Link href="/dashboard" className="flex items-center justify-center">
                    <span className="text-xl font-black tracking-tighter text-primary">L</span>
                  </Link>
                )}

                <Button
                  variant="ghost"
                  size="icon"
                  className="ml-auto size-9 lg:size-8"
                  onClick={toggleSidebar}
                >
                  {isSidebarExpanded ? (
                    <PanelLeftClose
                      size={18}
                      className="stroke-muted-foreground"
                    />
                  ) : (
                    <PanelRightClose
                      size={18}
                      className="stroke-muted-foreground"
                    />
                  )}
                  <span className="sr-only">Переключить боковую панель</span>
                </Button>
              </div>

              <nav className="flex flex-1 flex-col gap-8 px-4 pt-4">
                {links.map((section) => {
                  return (
                    <section
                      key={section.title}
                      className="flex flex-col gap-0.5"
                    >
                      {isSidebarExpanded ? (
                        <p className="text-xs text-muted-foreground">
                          {t(section.title)}
                        </p>
                      ) : (
                        <div className="h-4" />
                      )}
                      {section.items.map((item) => {
                        const Icon = Icons[item.icon || "arrowRight"];
                        return (
                          item.href && (
                            <Fragment key={`link-fragment-${item.title}`}>
                              {isSidebarExpanded ? (
                                <Link
                                  key={`link-${item.title}`}
                                  href={item.disabled ? "#" : item.href}
                                  className={cn(
                                    "flex items-center gap-3 rounded-md p-2 text-sm font-medium hover:bg-muted",
                                    path === item.href
                                      ? "bg-muted"
                                      : "text-muted-foreground hover:text-accent-foreground",
                                    item.disabled &&
                                    "cursor-not-allowed opacity-80 hover:bg-transparent hover:text-muted-foreground",
                                  )}
                                >
                                  <Icon className="size-5" />
                                  {t(item.title)}
                                  {item.badge && (
                                    <Badge className="ml-auto flex size-5 shrink-0 items-center justify-center rounded-full">
                                      {item.badge}
                                    </Badge>
                                  )}
                                </Link>
                              ) : (
                                <Tooltip key={`tooltip-${item.title}`}>
                                  <TooltipTrigger asChild>
                                    <Link
                                      key={`link-tooltip-${item.title}`}
                                      href={item.disabled ? "#" : item.href}
                                      className={cn(
                                        "flex items-center gap-3 rounded-md py-2 text-sm font-medium hover:bg-muted",
                                        path === item.href
                                          ? "bg-muted"
                                          : "text-muted-foreground hover:text-accent-foreground",
                                        item.disabled &&
                                        "cursor-not-allowed opacity-80 hover:bg-transparent hover:text-muted-foreground",
                                      )}
                                    >
                                      <span className="flex size-full items-center justify-center">
                                        <Icon className="size-5" />
                                      </span>
                                    </Link>
                                  </TooltipTrigger>
                                  <TooltipContent side="right">
                                    {t(item.title)}
                                  </TooltipContent>
                                </Tooltip>
                              )}
                            </Fragment>
                          )
                        );
                      })}
                    </section>
                  );
                })}
              </nav>

              <div className="mt-auto p-4 flex flex-col gap-4">
                {isSidebarExpanded ? (
                  <>
                    <BalanceWidget compactMode={true} />
                    <div className="flex items-center gap-3 px-2">
                      <UserAccountNav side="right" align="start" />
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col gap-4 items-center w-full">
                    <BalanceWidget compactMode={true} collapsed={true} />
                    <UserAccountNav side="right" align="start" collapsed={true} />
                  </div>
                )}
              </div>
            </div>
          </aside>
        </ScrollArea>
      </div>
    </TooltipProvider>
  );
}

export function MobileSheetSidebar({ links }: DashboardSidebarProps) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const { isSm, isMobile } = useMediaQuery();

  if (isSm || isMobile) {
    return (
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            className="size-9 shrink-0 md:hidden"
          >
            <Menu className="size-5" />
            <span className="sr-only">Меню навигации</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="flex flex-col p-0">
          <ScrollArea className="h-full overflow-y-auto">
            <div className="flex h-screen flex-col">
              <nav className="flex flex-1 flex-col gap-y-8 p-6 text-lg font-medium">
                <Link
                  href="#"
                  className="flex items-center gap-2 text-lg font-semibold"
                >
                  <Icons.logo className="size-6" />
                  <span className="font-urban text-xl font-bold">
                    {siteConfig.name}
                  </span>
                </Link>

                {/* <ProjectSwitcher large /> */}
                <span className="text-2xl font-black tracking-tighter text-primary px-2">LEO | AGENT&apos;S</span>

                {links.map((section) => (
                  <section
                    key={section.title}
                    className="flex flex-col gap-0.5"
                  >
                    <p className="text-xs text-muted-foreground">
                      {section.title}
                    </p>

                    {section.items.map((item) => {
                      const Icon = Icons[item.icon || "arrowRight"];
                      return (
                        item.href && (
                          <Fragment key={`link-fragment-${item.title}`}>
                            <Link
                              key={`link-${item.title}`}
                              onClick={() => {
                                if (!item.disabled) setOpen(false);
                              }}
                              href={item.disabled ? "#" : item.href}
                              className={cn(
                                "flex items-center gap-3 rounded-md p-2 text-sm font-medium hover:bg-muted",
                                path === item.href
                                  ? "bg-muted"
                                  : "text-muted-foreground hover:text-accent-foreground",
                                item.disabled &&
                                "cursor-not-allowed opacity-80 hover:bg-transparent hover:text-muted-foreground",
                              )}
                            >
                              <Icon className="size-5" />
                              {item.title}
                              {item.badge && (
                                <Badge className="ml-auto flex size-5 shrink-0 items-center justify-center rounded-full">
                                  {item.badge}
                                </Badge>
                              )}
                            </Link>
                          </Fragment>
                        )
                      );
                    })}
                  </section>
                ))}

                <div className="mt-auto flex flex-col gap-4">
                  <BalanceWidget compactMode={false} />
                  <div className="flex items-center gap-3">
                    <UserAccountNav side="top" align="start" />
                    <span className="text-sm font-medium text-muted-foreground">Профиль</span>
                  </div>
                </div>
              </nav>
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <div className="flex size-9 animate-pulse rounded-lg bg-muted md:hidden" />
  );
}

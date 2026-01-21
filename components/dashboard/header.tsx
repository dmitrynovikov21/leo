"use client"

import { useTranslations } from "next-intl";

interface DashboardHeaderProps {
  heading: string;
  text?: string;
  children?: React.ReactNode;
}

export function DashboardHeader({
  heading,
  text,
  children,
}: DashboardHeaderProps) {
  return (
    <div className="flex items-center justify-between">
      <div className="grid gap-1">
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900">{heading}</h1>
        {text && <p className="text-base text-muted-foreground">{text}</p>}
      </div>
      {children}
    </div>
  );
}

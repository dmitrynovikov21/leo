import { SidebarNavItem, SiteConfig } from "types";
import { env } from "@/env.mjs";

const site_url = env.NEXT_PUBLIC_APP_URL;

export const siteConfig: SiteConfig = {
  name: "LEO",
  description:
    "LEO — платформа для создания AI-агентов с базой знаний, интеграциями и аналитикой.",
  url: site_url,
  ogImage: `${site_url}/api/og?heading=${encodeURIComponent("LEO — платформа AI-агентов")}&type=LEO&mode=light`,
  links: {
    twitter: "",
    github: "",
  },
  mailSupport: "support@leo.ai",
};

export const footerLinks: SidebarNavItem[] = [
  {
    title: "Продукт",
    items: [
      { title: "Возможности", href: "#" },
      { title: "Тарифы", href: "/pricing" },
      { title: "Changelog", href: "#" },
    ],
  },
  {
    title: "Компания",
    items: [
      { title: "О нас", href: "#" },
      { title: "Условия", href: "/terms" },
      { title: "Конфиденциальность", href: "/privacy" },
    ],
  },
];

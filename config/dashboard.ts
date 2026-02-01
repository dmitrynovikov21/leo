import type { SidebarNavItem } from "@/types";

export const dashboardConfig = {
  mainNav: [
    {
      title: "Documentation",
      href: "/docs",
    },
    {
      title: "Support",
      href: "/support",
      disabled: true,
    },
  ],
  sidebarNav: [
    {
      title: "Dashboard",
      href: "/dashboard",
      icon: "dashboard",
    },
    {
      title: "Agents",
      href: "/dashboard/agents",
      icon: "user",
    },
    {
      title: "Billing",
      href: "/dashboard/billing",
      icon: "billing",
    },
    {
      title: "Settings",
      href: "/dashboard/settings",
      icon: "settings",
    },
  ],
};

// Export for compatibility with protected layout - expects sections with items
export const sidebarLinks: SidebarNavItem[] = [
  {
    title: "Navigation.dashboard", // Will be translated
    items: [
      {
        href: "/dashboard",
        icon: "dashboard",
        title: "Dashboard.title",
      },
      {
        href: "/dashboard/agents",
        icon: "user",
        title: "Agents.title",
      },
      {
        href: "/dashboard/knowledge",
        icon: "bookOpen",
        title: "Knowledge.title",
      },
      // Sources removed per user request
      // {
      //   href: "/dashboard/sources",
      //   icon: "laptop",
      //   title: "Источники",
      // },
      {
        href: "/dashboard/billing",
        icon: "billing",
        title: "Billing.title",
      },
      {
        href: "/dashboard/inbox",
        icon: "messages",
        title: "Inbox.title",
        disabled: true,
      },
    ],
  },
  {
    title: "Settings.title",
    items: [
      {
        href: "/dashboard/settings",
        icon: "settings",
        title: "Settings.title",
      },
      {
        href: "/admin",
        icon: "laptop",
        title: "Settings.admin",
        authorizeOnly: "ADMIN",
      },
    ],
  },
];

import { redirect } from "next/navigation";

import { sidebarLinks } from "@/config/dashboard";
import { getCurrentUser } from "@/lib/session";
import {
  DashboardSidebar,
  MobileSheetSidebar,
} from "@/components/layout/dashboard-sidebar";
import MaxWidthWrapper from "@/components/shared/max-width-wrapper";
import { UserPreferencesProvider } from "@/components/providers/user-preferences-provider";
import { UserProvider } from "@/components/providers/user-data-provider";
import { SessionTracker } from "@/components/providers/session-tracker";

interface ProtectedLayoutProps {
  children: React.ReactNode;
}

export default async function Dashboard({ children }: ProtectedLayoutProps) {
  const user = await getCurrentUser();

  if (!user) redirect("/login");

  const filteredLinks = sidebarLinks.map((section) => ({
    ...section,
    items: section.items.filter(
      ({ authorizeOnly }) => !authorizeOnly || authorizeOnly === user.role,
    ),
  }));

  return (
    <UserPreferencesProvider>
      <UserProvider>
        <SessionTracker />
        <div className="flex h-screen w-full overflow-hidden bg-background">
          {/* Sidebar - fixed height handled by component or flex */}
          <DashboardSidebar links={filteredLinks} />

          {/* Main Content Area */}
          <div className="flex flex-1 flex-col h-full overflow-hidden">
            {/* Mobile Header (md:hidden) */}
            <div className="md:hidden flex h-14 items-center border-b px-4 bg-background shrink-0 gap-4">
              <MobileSheetSidebar links={filteredLinks} />
              <span className="font-bold text-lg">LEO</span>
            </div>

            {/* Scrollable Content */}
            <main className="flex-1 overflow-y-auto p-0 scrollbar-thin">
              <MaxWidthWrapper className="flex h-full max-w-full flex-col px-0">
                {children}
              </MaxWidthWrapper>
            </main>
          </div>
        </div>
      </UserProvider>
    </UserPreferencesProvider>
  );
}

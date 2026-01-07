import { redirect } from "next/navigation";

import { sidebarLinks } from "@/config/dashboard";
import { getCurrentUser } from "@/lib/session";
import { SearchCommand } from "@/components/dashboard/search-command";
import {
  DashboardSidebar,
  MobileSheetSidebar,
} from "@/components/layout/dashboard-sidebar";
import { UserAccountNav } from "@/components/layout/user-account-nav";
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
            {/* Header - Stays at top */}
            <header className="flex h-14 shrink-0 bg-background px-4 lg:h-[60px] xl:px-8 border-b">
              <div className="flex w-full max-w-full items-center gap-x-3 px-0">
                <MobileSheetSidebar links={filteredLinks} />

                <div className="w-full flex-1">
                  {/* <SearchCommand links={filteredLinks} /> */}
                </div>

                <UserAccountNav />
              </div>
            </header>

            {/* Scrollable Content */}
            <main className="flex-1 overflow-y-auto p-4 xl:px-8 scrollbar-thin">
              <MaxWidthWrapper className="flex h-full max-w-full flex-col gap-4 px-0 lg:gap-6">
                {children}
              </MaxWidthWrapper>
            </main>
          </div>
        </div>
      </UserProvider>
    </UserPreferencesProvider>
  );
}

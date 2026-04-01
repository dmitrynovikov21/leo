import { getTranslations } from "next-intl/server";
import { getCurrentUser } from "@/lib/session";
import { constructMetadata } from "@/lib/utils";
import { DashboardHeader } from "@/components/dashboard/header";
import { OverviewDashboard } from "@/components/dashboard/overview-dashboard";

export const metadata = constructMetadata({
  title: "Dashboard – LEO",
  description: "Управляйте вашими AI-агентами и операциями.",
  noIndex: true,
});

export default async function DashboardPage() {
  const user = await getCurrentUser();
  const t = await getTranslations();

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <DashboardHeader
        heading={t('Dashboard.title')}
        text={t('Dashboard.description')}
      />
      <OverviewDashboard />
    </div>
  );
}

import { DashboardHeader } from "@/components/dashboard/header";
import { SkeletonSection } from "@/components/shared/section-skeleton";
import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardSettingsLoading() {
  return (
    <>
      <DashboardHeader
        heading={<Skeleton className="h-8 w-[200px]" />}
        text={<Skeleton className="h-[20px] w-[300px]" />}
      />
      <div className="divide-y divide-muted pb-10">
        <SkeletonSection />
        <SkeletonSection />
        <SkeletonSection card />
      </div>
    </>
  );
}

import { Skeleton } from "@/components/ui/skeleton";
import { DashboardHeader } from "@/components/dashboard/header";

export default function DashboardLoading() {
  return (
    <>
      <DashboardHeader
        heading={<Skeleton className="h-8 w-[200px]" />}
        text={<Skeleton className="h-[20px] w-[300px]" />}
      />
      <Skeleton className="size-full rounded-lg" />
    </>
  );
}

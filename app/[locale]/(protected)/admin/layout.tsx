import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/session";
import { AdminNav } from "./components/admin-nav";

interface ProtectedLayoutProps {
  children: React.ReactNode;
}

export default async function AdminLayout({ children }: ProtectedLayoutProps) {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") redirect("/login");

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <AdminNav />
      {children}
    </div>
  );
}

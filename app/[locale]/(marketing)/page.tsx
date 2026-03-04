import { auth } from "@/auth";
import { redirect } from "next/navigation";

export default async function IndexPage({
  params,
}: {
  params: { locale: string };
}) {
  const session = await auth();
  const locale = params.locale || "ru";

  if (session?.user) {
    redirect(`/${locale}/dashboard`);
  } else {
    redirect(`/${locale}/login`);
  }
}

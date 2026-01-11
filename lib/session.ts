import "server-only";

import { cache } from "react";
import { auth } from "@/auth";

export const getCurrentUser = cache(async () => {
  try {
    const session = await auth();
    if (session?.user) return session.user;
  } catch (error) {
    console.error("Auth error:", error);
  }

  return null;
});
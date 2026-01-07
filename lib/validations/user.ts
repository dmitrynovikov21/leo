import { UserRole } from "@prisma/client";
import * as z from "zod";

export const userNameSchema = z.object({
  name: z.string().min(3).max(32),
});

export const userRoleSchema = z.object({
  role: z.nativeEnum(UserRole),
});

export const userProfileSchema = z.object({
  name: z.string().min(2).max(32).optional(),
  jobTitle: z.string().max(64).optional(),
  timezone: z.string().optional(),
  bio: z.string().max(500).optional(),
});

export const userPasswordSchema = z.object({
  currentPassword: z.string(),
  newPassword: z.string().min(6),
});

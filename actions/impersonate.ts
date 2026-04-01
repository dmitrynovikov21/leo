'use server'

import { cookies } from 'next/headers'
import { encode } from 'next-auth/jwt'
import { auth } from '@/auth'
import { prisma } from '@/lib/db'

function getSessionCookieInfo() {
  const useSecure =
    process.env.NEXTAUTH_URL?.startsWith('https://') ||
    process.env.NEXT_PUBLIC_APP_URL?.startsWith('https://')
  const name = useSecure
    ? '__Secure-authjs.session-token'
    : 'authjs.session-token'
  return { name, secure: !!useSecure }
}

export async function impersonateUser(userId: string) {
  const session = await auth()
  if (session?.user?.role !== 'ADMIN') throw new Error('Unauthorized')

  // Don't allow impersonating yourself
  if (session.user.id === userId) throw new Error('Cannot impersonate yourself')

  const targetUser = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { id: true, email: true, name: true, role: true, image: true },
  })

  const adminId = session.user.impersonatedBy ?? session.user.id

  const { name: cookieName, secure } = getSessionCookieInfo()

  const newToken = await encode({
    token: {
      sub: targetUser.id,
      name: targetUser.name,
      email: targetUser.email,
      picture: targetUser.image,
      role: targetUser.role,
      impersonatedBy: adminId,
    },
    secret: process.env.AUTH_SECRET!,
    salt: cookieName,
  })

  const cookieStore = await cookies()
  cookieStore.set(cookieName, newToken, {
    httpOnly: true,
    secure,
    path: '/',
    sameSite: 'lax',
  })

  return { success: true }
}

export async function stopImpersonation() {
  const session = await auth()
  if (!session?.user) throw new Error('Unauthorized')

  const adminId = session.user.impersonatedBy
  if (!adminId) throw new Error('Not impersonating')

  const admin = await prisma.user.findUniqueOrThrow({
    where: { id: adminId },
    select: { id: true, email: true, name: true, role: true, image: true },
  })

  const { name: cookieName, secure } = getSessionCookieInfo()

  const newToken = await encode({
    token: {
      sub: admin.id,
      name: admin.name,
      email: admin.email,
      picture: admin.image,
      role: admin.role,
    },
    secret: process.env.AUTH_SECRET!,
    salt: cookieName,
  })

  const cookieStore = await cookies()
  cookieStore.set(cookieName, newToken, {
    httpOnly: true,
    secure,
    path: '/',
    sameSite: 'lax',
  })

  return { success: true }
}

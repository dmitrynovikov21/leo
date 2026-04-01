'use server'

import { auth } from '@/auth'
import { prisma } from '@/lib/db'
import type { SupportTicketStatus } from '@prisma/client'

function assertAdmin(session: any) {
  if (!session?.user?.id || session.user.role !== 'ADMIN') {
    throw new Error('Unauthorized: Admin access required')
  }
}

/**
 * Get all support tickets for admin
 */
export async function getAdminTickets(opts?: {
  status?: string
  search?: string
  limit?: number
  offset?: number
}) {
  const session = await auth()
  assertAdmin(session)

  const { status, search, limit = 50, offset = 0 } = opts || {}

  const where: any = {}
  if (status && status !== 'ALL') {
    where.status = status
  }
  if (search) {
    where.OR = [
      { subject: { contains: search, mode: 'insensitive' } },
      { user: { email: { contains: search, mode: 'insensitive' } } },
      { user: { name: { contains: search, mode: 'insensitive' } } },
    ]
  }

  const [tickets, total] = await Promise.all([
    prisma.supportTicket.findMany({
      where,
      include: {
        user: { select: { name: true, email: true } },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: { sender: { select: { name: true, role: true } } },
        },
        _count: { select: { messages: true } },
      },
      orderBy: { updatedAt: 'desc' },
      take: limit,
      skip: offset,
    }),
    prisma.supportTicket.count({ where }),
  ])

  return {
    tickets: tickets.map((t) => ({
      id: t.id,
      subject: t.subject,
      status: t.status,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
      user: t.user,
      messageCount: t._count.messages,
      lastMessage: t.messages[0]
        ? {
            content: t.messages[0].content.slice(0, 120),
            senderName: t.messages[0].sender.name,
            senderRole: t.messages[0].sender.role,
            createdAt: t.messages[0].createdAt,
          }
        : null,
    })),
    total,
  }
}

/**
 * Update ticket status
 */
export async function updateTicketStatus(ticketId: string, status: SupportTicketStatus) {
  const session = await auth()
  assertAdmin(session)

  await prisma.supportTicket.update({
    where: { id: ticketId },
    data: { status },
  })

  return { success: true }
}

/**
 * Get admin support stats
 */
export async function getSupportStats() {
  const session = await auth()
  assertAdmin(session)

  const [open, inProgress, resolved, total] = await Promise.all([
    prisma.supportTicket.count({ where: { status: 'OPEN' } }),
    prisma.supportTicket.count({ where: { status: 'IN_PROGRESS' } }),
    prisma.supportTicket.count({ where: { status: 'RESOLVED' } }),
    prisma.supportTicket.count(),
  ])

  return { open, inProgress, resolved, total }
}

'use server'

import { auth } from '@/auth'
import { prisma } from '@/lib/db'
import { notifySupportTicket } from '@/lib/telegram-notify'

/**
 * Get current user's support tickets
 */
export async function getUserTickets() {
  const session = await auth()
  if (!session?.user?.id) throw new Error('Unauthorized')

  const tickets = await prisma.supportTicket.findMany({
    where: { userId: session.user.id },
    include: {
      messages: {
        orderBy: { createdAt: 'desc' },
        take: 1,
        include: { sender: { select: { name: true, role: true } } },
      },
      _count: { select: { messages: true } },
    },
    orderBy: { updatedAt: 'desc' },
  })

  return tickets.map((t) => ({
    id: t.id,
    subject: t.subject,
    status: t.status,
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
    messageCount: t._count.messages,
    lastMessage: t.messages[0]
      ? {
          content: t.messages[0].content.slice(0, 100),
          senderName: t.messages[0].sender.name,
          senderRole: t.messages[0].sender.role,
          createdAt: t.messages[0].createdAt,
        }
      : null,
  }))
}

/**
 * Create a new support ticket with initial message
 */
export async function createTicket(data: {
  subject: string
  message: string
  attachments?: { filename: string; storedName: string; size: number; mimeType: string }[]
}) {
  const session = await auth()
  if (!session?.user?.id) throw new Error('Unauthorized')

  if (!data.subject.trim() || !data.message.trim()) {
    throw new Error('Тема и сообщение обязательны')
  }

  const ticket = await prisma.supportTicket.create({
    data: {
      userId: session.user.id,
      subject: data.subject.trim(),
      messages: {
        create: {
          senderId: session.user.id,
          content: data.message.trim(),
          attachments: data.attachments || undefined,
        },
      },
    },
  })

  notifySupportTicket(session.user.email || session.user.id, data.subject.trim(), data.message.trim())

  return { id: ticket.id }
}

/**
 * Get ticket messages (only own tickets for users)
 */
export async function getTicketMessages(ticketId: string) {
  const session = await auth()
  if (!session?.user?.id) throw new Error('Unauthorized')

  const ticket = await prisma.supportTicket.findFirst({
    where: {
      id: ticketId,
      ...(session.user.role !== 'ADMIN' ? { userId: session.user.id } : {}),
    },
    include: {
      user: { select: { name: true, email: true, role: true } },
      messages: {
        orderBy: { createdAt: 'asc' },
        include: {
          sender: { select: { id: true, name: true, email: true, role: true } },
        },
      },
    },
  })

  if (!ticket) throw new Error('Тикет не найден')

  return {
    id: ticket.id,
    subject: ticket.subject,
    status: ticket.status,
    createdAt: ticket.createdAt,
    user: ticket.user,
    messages: ticket.messages.map((m) => ({
      id: m.id,
      content: m.content,
      attachments: m.attachments as any[] | null,
      createdAt: m.createdAt,
      sender: m.sender,
      isOwn: m.senderId === session.user!.id,
    })),
  }
}

/**
 * Send a message in a ticket
 */
export async function sendMessage(data: {
  ticketId: string
  content: string
  attachments?: { filename: string; storedName: string; size: number; mimeType: string }[]
}) {
  const session = await auth()
  if (!session?.user?.id) throw new Error('Unauthorized')

  if (!data.content.trim()) throw new Error('Сообщение не может быть пустым')

  // Check access
  const ticket = await prisma.supportTicket.findFirst({
    where: {
      id: data.ticketId,
      ...(session.user.role !== 'ADMIN' ? { userId: session.user.id } : {}),
    },
  })

  if (!ticket) throw new Error('Тикет не найден')
  if (ticket.status === 'CLOSED') throw new Error('Тикет закрыт')

  const [message] = await prisma.$transaction([
    prisma.supportMessage.create({
      data: {
        ticketId: data.ticketId,
        senderId: session.user.id,
        content: data.content.trim(),
        attachments: data.attachments || undefined,
      },
    }),
    prisma.supportTicket.update({
      where: { id: data.ticketId },
      data: {
        status: session.user.role === 'ADMIN' ? 'IN_PROGRESS' : ticket.status,
      },
    }),
  ])

  return { id: message.id }
}

"use server"

import { prisma } from "@/lib/db"
import { getCurrentUser } from "@/lib/session"
import { revalidatePath } from "next/cache"

export interface TestCaseData {
    id: string
    question: string
    expectedAnswer: string
}

export async function getTestCases(agentId: string): Promise<TestCaseData[]> {
    const user = await getCurrentUser()
    if (!user) return []

    // Verify agent belongs to user
    const agent = await prisma.agent.findFirst({
        where: { id: agentId, userId: user.id }
    })
    if (!agent) return []

    const cases = await prisma.agentTestCase.findMany({
        where: { agentId },
        orderBy: { createdAt: 'asc' }
    })

    return cases.map(c => ({
        id: c.id,
        question: c.question,
        expectedAnswer: c.expectedAnswer
    }))
}

export async function addTestCase(agentId: string, question: string, expectedAnswer: string) {
    const user = await getCurrentUser()
    if (!user) throw new Error("Unauthorized")

    // Verify agent belongs to user
    const agent = await prisma.agent.findFirst({
        where: { id: agentId, userId: user.id }
    })
    if (!agent) throw new Error("Agent not found")

    const testCase = await prisma.agentTestCase.create({
        data: {
            agentId,
            question,
            expectedAnswer
        }
    })

    revalidatePath(`/dashboard/agents/${agentId}/test`)
    return { success: true, id: testCase.id }
}

export async function deleteTestCase(id: string) {
    const user = await getCurrentUser()
    if (!user) throw new Error("Unauthorized")

    // Verify ownership via agent
    const testCase = await prisma.agentTestCase.findUnique({
        where: { id },
        include: { agent: { select: { userId: true } } }
    })

    if (!testCase || testCase.agent.userId !== user.id) {
        throw new Error("Test case not found")
    }

    await prisma.agentTestCase.delete({ where: { id } })

    revalidatePath(`/dashboard/agents/${testCase.agentId}/test`)
    return { success: true }
}

export async function updateTestCase(id: string, question: string, expectedAnswer: string) {
    const user = await getCurrentUser()
    if (!user) throw new Error("Unauthorized")

    const testCase = await prisma.agentTestCase.findUnique({
        where: { id },
        include: { agent: { select: { userId: true, id: true } } }
    })

    if (!testCase || testCase.agent.userId !== user.id) {
        throw new Error("Test case not found")
    }

    await prisma.agentTestCase.update({
        where: { id },
        data: { question, expectedAnswer }
    })

    revalidatePath(`/dashboard/agents/${testCase.agent.id}/test`)
    return { success: true }
}

import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { aiFetch, getOrchestratorUrl, getGatewayUrl } from "@/lib/ai-fetch";
import { notifyAgentCreated } from "@/lib/telegram-notify";

// Map wizard style IDs to behavior tone values
const STYLE_TO_TONE: Record<string, string> = {
    "A": "professional",
    "B": "friendly",
    "C": "concise",
};

// Map wizard restriction IDs to human-readable rules
const RESTRICTION_LABELS: Record<string, string> = {
    no_prices: "Не называть точные цены",
    no_competitors: "Не обсуждать конкурентов",
    no_legal: "Не давать юридических советов",
    no_deadlines: "Не обещать конкретные сроки",
    no_hallucination: "Не выдумывать информацию (отвечать только по базе знаний)",
};

const FALLBACK_LABELS: Record<string, string> = {
    leave_phone: "Оставьте номер, менеджер свяжется",
    email: "Напишите на email",
    call: "Позвоните по телефону",
    will_check: "Я уточню и вернусь с ответом",
};

// POST — finalize wizard: save all data to agent fields, DRAFT → STOPPED, sync orchestrator
export async function POST(
    req: Request,
    { params }: { params: { id: string } }
) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const agent = await prisma.agent.findFirst({
            where: { id: params.id, userId: session.user.id },
        });

        if (!agent) {
            return NextResponse.json({ error: "Agent not found" }, { status: 404 });
        }

        const body = await req.json();
        const {
            systemPrompt,
            name,
            description,
            displayName,
            tone,
            guardrails,
            welcomeMessage,
            temperature,
            // Full wizard data for comprehensive save
            wizardData,
        } = body;

        // Build guardrails from wizard restrictions
        let finalGuardrails = guardrails;
        if (!finalGuardrails && wizardData) {
            const s4 = wizardData.step4;
            if (s4) {
                const rules: { rule: string }[] = [];
                // Add preset restrictions
                for (const id of (s4.restrictions || [])) {
                    rules.push({ rule: RESTRICTION_LABELS[id] || id });
                }
                // Add custom restrictions
                for (const rule of (s4.customRestrictions || [])) {
                    rules.push({ rule });
                }
                // Add fallback behavior as a rule
                if (s4.fallback) {
                    const fallbackText = FALLBACK_LABELS[s4.fallback] || s4.fallback;
                    const contact = s4.fallbackContact ? ` (${s4.fallbackContact})` : "";
                    rules.push({ rule: `Если не знаешь ответа: "${fallbackText}"${contact}` });
                }
                finalGuardrails = rules;
            }
        }

        // Build tone from wizard style
        let finalTone = tone;
        if (!finalTone && wizardData?.step3?.selectedStyle) {
            const styleId = wizardData.step3.selectedStyle.id;
            const toneName = STYLE_TO_TONE[styleId] || wizardData.step3.selectedStyle.label?.toLowerCase();
            finalTone = toneName ? [toneName] : [];
        }

        // Build welcome message from wizard fallback contact
        let finalWelcome = welcomeMessage;
        if (!finalWelcome && wizardData?.step4?.fallbackContact) {
            finalWelcome = `Здравствуйте! Чем могу помочь? Если что — можете связаться: ${wizardData.step4.fallbackContact}`;
        }

        // Build conversation examples from manual FAQ
        let conversationExamples: string | undefined;
        if (wizardData?.step2?.manualFaq?.length) {
            const faqEntries = wizardData.step2.manualFaq
                .filter((f: any) => f.question && f.answer)
                .map((f: any) => `Клиент: ${f.question}\nАгент: ${f.answer}`)
                .join("\n\n");
            if (faqEntries) {
                conversationExamples = faqEntries;
            }
        }

        const finalName = name || agent.name;
        const finalDescription = description || agent.description;
        const finalDisplayName = displayName || name || agent.displayName || agent.name;

        console.log(`[Finalize] Agent ${params.id}: saving fields:`, {
            name: finalName,
            displayName: finalDisplayName,
            tone: finalTone,
            guardrailsCount: finalGuardrails?.length,
            welcomeMessage: finalWelcome?.slice(0, 50),
            conversationExamples: conversationExamples?.slice(0, 50),
            hasSystemPrompt: !!(systemPrompt || agent.systemPrompt),
            wizardSteps: wizardData ? Object.keys(wizardData).filter(k => k.startsWith('step')) : [],
        });

        // Update agent locally with ALL fields
        await prisma.agent.update({
            where: { id: params.id },
            data: {
                systemPrompt: systemPrompt || agent.systemPrompt,
                name: finalName,
                description: finalDescription,
                role: finalDescription?.slice(0, 100) || agent.role || "Assistant",
                displayName: finalDisplayName,
                status: "STOPPED",
                tone: finalTone || [],
                guardrails: finalGuardrails || [],
                temperature: temperature ?? 0.5,
                showSources: wizardData?.step3?.showSources ?? false,
                welcomeMessage: finalWelcome || null,
                conversationExamples: conversationExamples || null,
            },
        });

        console.log(`[Finalize] Agent ${params.id}: Prisma update done`);

        // Create a single knowledge base note from all manual FAQ entries (best-effort)
        const faqItems = (wizardData?.step2?.manualFaq || []).filter((f: any) => f.question && f.answer);
        if (faqItems.length > 0) {
            const orchestratorBaseUrl = getOrchestratorUrl();
            const gatewayBaseUrl = getGatewayUrl();
            if (orchestratorBaseUrl) {
                const title = "Частые вопросы";
                const content = faqItems
                    .map((f: any) => `Вопрос: ${f.question}\nОтвет: ${f.answer}`)
                    .join("\n\n");
                try {
                    await aiFetch(`${orchestratorBaseUrl}/api/v1/agents/${params.id}/notes`, {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            "x-user-id": session.user.id,
                        },
                        body: JSON.stringify({ title, content }),
                    });
                    if (gatewayBaseUrl) {
                        await aiFetch(`${gatewayBaseUrl}/api/v1/documents/vectorize`, {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                                agentId: params.id,
                                userId: session.user.id,
                                filename: `note_${title}`,
                                fileSize: content.length,
                                mimeType: "text/plain",
                                chunks: [{ index: 0, text: content }],
                            }),
                        });
                    }
                    console.log(`[Finalize] Agent ${params.id}: FAQ note created (${faqItems.length} entries)`);
                } catch (e) {
                    console.warn(`[Finalize] Failed to create FAQ note:`, e);
                }
            }
        }

        // Save default schedule (Mon-Fri 9-18) so the agent knows its working hours
        const orchestratorUrl = getOrchestratorUrl();
        if (orchestratorUrl) {
            try {
                const defaultSchedule = Array.from({ length: 7 }, (_, day) =>
                    Array.from({ length: 24 }, (_, hour) => day < 5 && hour >= 9 && hour < 18)
                );
                await aiFetch(`${orchestratorUrl}/api/v1/agents/${params.id}/schedule`, {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json",
                        "x-user-id": session.user.id,
                    },
                    body: JSON.stringify({
                        schedule: defaultSchedule,
                        message: "Здравствуйте! Сейчас я не на связи. Я отвечу вам в рабочее время.",
                        holidays: [],
                    }),
                });
                console.log(`[Finalize] Agent ${params.id}: default schedule saved`);
            } catch (e) {
                console.warn("[Finalize] Failed to save default schedule:", e);
            }
        }

        // Sync with orchestrator (best-effort)
        // NOTE: Do NOT POST to /api/v1/agents — agent already exists in DB (created as DRAFT).
        // POST would create a duplicate. Instead, sync behavior + prompt version via PATCH/POST.
        if (orchestratorUrl) {
            try {
                // Sync behavior settings to orchestrator
                await aiFetch(`${orchestratorUrl}/api/v1/agents/${params.id}/behavior`, {
                    method: "PATCH",
                    headers: {
                        "Content-Type": "application/json",
                        "x-user-id": session.user.id,
                    },
                    body: JSON.stringify({
                        displayName: finalDisplayName,
                        temperature: temperature ?? 0.5,
                        tone: finalTone || [],
                        guardrails: finalGuardrails || [],
                        welcomeMessage: finalWelcome || "",
                    }),
                });

                // Create initial prompt version
                await aiFetch(`${orchestratorUrl}/api/v1/agents/${params.id}/prompts`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "x-user-id": session.user.id,
                    },
                    body: JSON.stringify({
                        version: "v1.0",
                        content: systemPrompt || agent.systemPrompt,
                        isActive: true,
                    }),
                });
            } catch (e) {
                console.warn("[Finalize] Orchestrator sync failed (non-critical):", e);
            }
        }

        // Notify admin
        const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { email: true } });
        notifyAgentCreated(finalName, user?.email || session.user.id, params.id);

        return NextResponse.json({ ok: true });
    } catch (error) {
        console.error("Finalize error:", error);
        return NextResponse.json({ error: "Failed to finalize" }, { status: 500 });
    }
}

import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";

// AI Metadata generation types
interface AIMetadata {
    ai_title: string;
    category: string;
    summary: string;
    utility: string;
    topics: string[];
}

// Extract text snippet: first 2000 chars + last 1000 chars
function extractTextSnippet(text: string): string {
    if (text.length <= 3000) return text;

    const first = text.slice(0, 2000);
    const last = text.slice(-1000);
    return `${first}\n\n[...]\n\n${last}`;
}

// System prompt for metadata generation
const SYSTEM_PROMPT = `Role: Expert Data Analyst.
Task: Analyze the provided text snippet and generate a structured JSON summary.

Output Format (JSON Only, no markdown):
{
  "ai_title": "Clear, readable title (3-5 words). No technical jargon like 'v2', 'scan'.",
  "category": "Specific category (e.g., 'Legal Contract', 'API Docs', 'Invoice', 'Technical Manual').",
  "summary": "Dense summary of the content (what is inside?). 2-3 sentences in Russian.",
  "utility": "Answer in Russian: What specific user questions can this file answer?",
  "topics": ["Tag1", "Tag2", "Tag3", "Tag4"]
}

Important:
- Respond ONLY with valid JSON, no explanations
- Write summary and utility in Russian
- Topics should be in original document language`;

export async function POST(req: Request) {
    try {
        const session = await auth();

        if (!session?.user?.id) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }

        const body = await req.json();
        const { documentId, filename, textContent, isLibraryItem } = body;

        if (!documentId || !textContent) {
            return NextResponse.json(
                { error: "documentId and textContent are required" },
                { status: 400 }
            );
        }

        const gatewayUrl = process.env.AI_GATEWAY_URL || process.env.NEXT_PUBLIC_AI_GATEWAY_URL;

        if (!gatewayUrl) {
            console.error("Gateway URL is not defined");
            return NextResponse.json({ error: "Service Configuration Error" }, { status: 500 });
        }

        // Prepare text snippet
        const textSnippet = extractTextSnippet(textContent);

        // Build user message
        const userMessage = `Original Filename: ${filename || 'unknown'}

Text:
${textSnippet}`;

        console.log(`[AI Metadata] Generating metadata for document ${documentId} (isLibraryItem: ${isLibraryItem})`);

        // Call LLM via Gateway
        const response = await fetch(`${gatewayUrl}/api/v1/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                userId: session.user.id,
                messages: [
                    { role: "system", content: SYSTEM_PROMPT },
                    { role: "user", content: userMessage }
                ],
                model: "gpt-4o-mini", // Fast and cost-effective
                temperature: 0.3,
                max_tokens: 500
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`Gateway error: ${response.status} ${errorText}`);
            return NextResponse.json(
                { error: "Failed to generate metadata" },
                { status: response.status }
            );
        }

        const data = await response.json();

        // Extract content from response
        const content = data.choices?.[0]?.message?.content || data.content || data.response;

        if (!content) {
            console.error("No content in LLM response:", data);
            return NextResponse.json({ error: "Empty LLM response" }, { status: 500 });
        }

        // Parse JSON from response (handle potential markdown code blocks)
        let metadata: AIMetadata;
        try {
            // Remove potential markdown code blocks
            let jsonStr = content.trim();
            if (jsonStr.startsWith('```')) {
                jsonStr = jsonStr.replace(/```json?\n?/g, '').replace(/```$/g, '').trim();
            }
            metadata = JSON.parse(jsonStr);
        } catch (parseError) {
            console.error("Failed to parse LLM response as JSON:", content);
            return NextResponse.json({ error: "Invalid JSON in LLM response" }, { status: 500 });
        }

        // Save to appropriate table based on isLibraryItem flag
        if (isLibraryItem) {
            await prisma.libraryItem.update({
                where: { id: documentId },
                data: { aiMetadata: metadata as unknown as Prisma.InputJsonValue }
            });
        } else {
            await prisma.knowledgeBase.update({
                where: { id: documentId },
                data: { aiMetadata: metadata as unknown as Prisma.InputJsonValue }
            });
        }

        console.log(`[AI Metadata] Successfully generated metadata for ${documentId}`);

        return NextResponse.json({
            success: true,
            metadata
        });

    } catch (error) {
        console.error("Error generating metadata:", error);
        return NextResponse.json(
            { error: "Failed to generate metadata" },
            { status: 500 }
        );
    }
}

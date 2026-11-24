import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

type ChatMessage = { role: "user" | "assistant"; content: string };
const MODES: Record<string, string> = {
  tutor: "Act as a patient, rigorous personal tutor. Explain ideas clearly, use examples, and check for understanding. Do not jump straight to a final answer when guided learning would be better.",
  solve: "Help solve the student's problem step by step. State the relevant principle, show the reasoning, and explain why each step is valid. If information is missing, ask a focused question.",
  quiz: "Act as an interactive examiner. Ask one question at a time, wait for the student's response, then grade it with constructive feedback and explain any misconception. Do not reveal the answer before the student tries.",
  flashcards: "Create useful active-recall flashcards. Format each card as **Q:** question followed by **A:** concise answer. Focus on understanding, not trivia.",
  summarize: "Create a structured, accurate study summary with key concepts, definitions, relationships, and a short self-check at the end."
};

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) return NextResponse.json({ error: "The AI service is not configured yet. Add GROQ_API_KEY to your Vercel environment variables." }, { status: 503 });

    const body = await request.json();
    const { messages, subject, level, mode } = body as {
      messages: ChatMessage[]; subject?: string; level?: string; mode?: string;
    };

    if (!Array.isArray(messages) || messages.length === 0 || messages.length > 30) {
      return NextResponse.json({ error: "Please send a valid conversation (up to 30 messages)." }, { status: 400 });
    }
    const cleanMessages = messages.filter(m =>
      m && (m.role === "user" || m.role === "assistant") &&
      typeof m.content === "string" && m.content.trim().length > 0
    );
    if (!cleanMessages.length || cleanMessages.some(m => m.content.length > 8000)) {
      return NextResponse.json({ error: "A message is empty or too long. Please shorten it and try again." }, { status: 400 });
    }

    const systemPrompt = `You are StudyMate AI, a supportive but intellectually honest study assistant.
Student level: ${String(level || "High school").slice(0, 80)}.
Subject: ${String(subject || "General").slice(0, 80)}.
Learning mode: ${String(mode || "tutor").slice(0, 30)}.
${MODES[mode || "tutor"] || MODES.tutor}

Teaching rules:
- Adapt explanations to the student's level without being condescending.
- Be accurate. If uncertain, say so rather than inventing facts.
- Write like a good tutor: lead with the core idea in plain language, then one worked example. Do not pad the answer or number your section headings.
- Use short paragraphs. Use a list or table only when the content really is a list or a comparison.
- Do not use emoji.
- Math formatting is strict: write inline math as $...$ and display equations as $$...$$ on their own lines. Never use \\( \\) or \\[ \\] delimiters, and never put math inside backticks.
- Define variables and include units in calculations.
- For coding, use fenced code blocks with the language specified and explain important decisions.
- Encourage the student to attempt a step before revealing a full solution when appropriate.
- Never claim to have checked work, run code, or accessed external resources unless you actually have.
- Keep the answer focused on the student's question.`;

    const upstream = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "openai/gpt-oss-20b",
        messages: [{ role: "system", content: systemPrompt }, ...cleanMessages],
        temperature: 0.55,
        max_tokens: 2000
      }),
      signal: AbortSignal.timeout(45000)
    });

    const data = await upstream.json();
    if (!upstream.ok) {
      console.error("Groq API error:", data?.error?.message || upstream.status);
      return NextResponse.json({ error: "The AI provider could not complete that request. Please try again in a moment." }, { status: 502 });
    }
    const reply = data?.choices?.[0]?.message?.content;
    if (typeof reply !== "string" || !reply.trim()) {
      return NextResponse.json({ error: "The AI returned an empty response. Please try again." }, { status: 502 });
    }
    return NextResponse.json({ reply });
  } catch (error) {
    console.error("Chat route error:", error);
    return NextResponse.json({ error: "Something went wrong while contacting the AI. Check your connection and try again." }, { status: 500 });
  }
}

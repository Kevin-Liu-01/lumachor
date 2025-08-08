import 'server-only';

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/app/(auth)/auth';
import { ChatSDKError } from '@/lib/errors';

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { eq } from 'drizzle-orm';
import { context as ContextTable, user as UserTable } from '@/lib/db/schema';

import { generateText } from 'ai';
import { myProvider } from '@/lib/ai/providers';

// --- DB client (route-scoped) ---
function getDb() {
  const client = postgres(process.env.POSTGRES_URL!);
  return drizzle(client);
}

const GenerateBody = z.object({
  userPrompt: z.string().min(4),
  tags: z.array(z.string()).default([]),
  model: z
    .enum(['chat-model', 'chat-model-reasoning', 'title-model', 'artifact-model'])
    .optional(),
});

/** The structured payload we expect from the LLM */
const ContextJSONSchema = z.object({
  title: z.string().min(3).max(120),
  description: z.string().min(1).max(800),
  background_goals: z.array(z.string()).min(1).max(20),
  tone_style: z.array(z.string()).min(1).max(20),
  constraints_scope: z.array(z.string()).min(1).max(20),
  example_prompts: z.array(z.string()).min(1).max(10),
});

type ContextJSON = z.infer<typeof ContextJSONSchema>;

async function ensureUser(
  db: ReturnType<typeof getDb>,
  { id, email }: { id: string; email?: string | null },
) {
  const [existing] = await db
    .select()
    .from(UserTable)
    .where(eq(UserTable.id, id))
    .limit(1);
  if (existing) return existing;

  const safeEmail = email && email.length <= 64 ? email : `guest-${Date.now()}`;
  const [created] = await db.insert(UserTable).values({ id, email: safeEmail }).returning();
  return created;
}

/** Force strict JSON-only output we can validate */
function generatorPromptJSON(userPrompt: string, tags: string[]) {
  return `You are an expert prompt engineer whose sole task is to craft a **high-quality, reusable context template** for a downstream chatbot.
This template must prepare the chatbot to operate with deep knowledge, clear goals, and actionable instructions.

USER’S REQUEST:
"${userPrompt}"

SELECTED TAGS: ${tags.join(', ') || '(none)'}  (e.g. customer-support, coding, interview-prep, character-design)

────────────────────
INSTRUCTIONS
────────────────────
Using the user’s request and the selected tags, generate a **rich, detailed** context that includes the following EXACT JSON fields:

{
  "title": string — 3–6 words summarizing the chatbot's purpose for this context,
  "description": string — 1 short paragraph (2–4 sentences) explaining the overall role, mission, and intended impact of the chatbot in this context,
  "background_goals": string[] — 4–10 bullet points giving the key facts, assumptions, domain knowledge, and objectives the chatbot should operate with,
  "tone_style": string[] — 3–6 bullet points describing the exact communication style, voice, and any formatting rules (e.g. step-by-step, bullet lists, formal/informal),
  "constraints_scope": string[] — 3–6 bullet points stating clear boundaries, what to avoid, off-topic areas, and limits of knowledge or scope,
  "example_prompts": string[] — 2–5 realistic example user messages that are **directly relevant** to this context
}

CONTENT REQUIREMENTS:
- The JSON must be **deeply informative** — avoid vague or generic statements.
- “background_goals” should give the chatbot **practical context** it can use immediately.
- “tone_style” must clearly communicate how the chatbot should sound and structure replies.
- “constraints_scope” must ensure the chatbot stays in its lane and avoids irrelevant or risky territory.
- “example_prompts” must be realistic queries a user in this context would actually ask.

OUTPUT RULES:
- Output STRICT JSON only — no markdown, no prose, no commentary.
- Each field must be present exactly as listed above.
- Strings must be concise yet rich in useful detail.
- All arrays must have at least the minimum required items.

Now produce the final JSON object.`;
}

function tagPromptFromPayload(payload: ContextJSON) {
  const pack = [
    payload.title,
    payload.description,
    ...payload.background_goals,
    ...payload.tone_style,
    ...payload.constraints_scope,
    ...payload.example_prompts,
  ]
    .join('\n')
    .slice(0, 4000);

  return `You are labeling a prompt context for retrieval. 
Return 3 short, lowercase, single-word tags that best categorize this context (no punctuation, no sentences). 
Output MUST be a comma-separated list only (e.g. "coding, support, tutor").

CONTEXT:
${pack}
`;
}

export async function POST(req: Request) {
  // 1) Auth
  const session = await auth();
  if (!session?.user?.id) {
    return new ChatSDKError('unauthorized:chat').toResponse();
  }

  // 2) Validate request body
  let parsed: z.infer<typeof GenerateBody>;
  try {
    parsed = GenerateBody.parse(await req.json());
  } catch {
    return new ChatSDKError('bad_request:api', 'Invalid request body').toResponse();
  }

  const db = getDb();

  // 3) Ensure User exists (satisfy FK)
  try {
    await ensureUser(db, {
      id: session.user.id as string,
      email: session.user.email ?? null,
    });
  } catch {
    return new ChatSDKError('bad_request:database', 'Failed to ensure user').toResponse();
  }

  // 4) Ask myProvider to return STRICT JSON
  const { userPrompt, tags } = parsed;
  const modelId = parsed.model ?? 'chat-model'; // xAI via myProvider

  let raw: string;
  try {
    const result = await generateText({
      model: myProvider.languageModel(modelId),
      system:
        'Return ONLY a strict JSON object as specified. No markdown fences, no commentary, no code blocks.',
      prompt: generatorPromptJSON(userPrompt, tags),
      temperature: 0.3,
    });
    raw = result.text.trim();
  } catch (e: any) {
    const msg =
      e?.message ||
      e?.toString?.() ||
      `Model "${modelId}" failed (check XAI_API_KEY or model availability).`;
    return NextResponse.json(
      { code: 'bad_request:api', message: msg, model: modelId },
      { status: 400 },
    );
  }

  // 5) Parse + validate JSON (with friendly error if model drifted)
  let payload: ContextJSON;
  try {
    // Some models occasionally wrap JSON in codefences; strip if present
    const sanitized = raw.replace(/^```(?:json)?\s*/i, '').replace(/```$/, '');
    const parsedJSON = JSON.parse(sanitized);
    payload = ContextJSONSchema.parse(parsedJSON);
  } catch (err) {
    console.error('[contexts.generate] JSON parse/validate failed:', { raw });
    return new ChatSDKError(
      'bad_request:api',
      'Model returned invalid JSON. Please try again.',
    ).toResponse();
  }

  // 6) Decide title/description from payload
  const name = payload.title.slice(0, 80);
  const description = payload.description.slice(0, 240);

  // 7) Auto-generate tags IF not provided by caller
  let finalTags = (tags || []).filter(Boolean);
  if (finalTags.length === 0) {
    try {
      const tagResult = await generateText({
        model: myProvider.languageModel('title-model'),
        system: 'Output only a comma-separated list of 3–6 short lowercase tags.',
        prompt: tagPromptFromPayload(payload),
        temperature: 0.2,
      });
      finalTags = tagResult.text
        .split(',')
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean)
        .slice(0, 8);
    } catch {
      finalTags = [];
    }
  }

  // 8) Store the structured payload AS JSON (stringified) in `content`, plus name/description/tags columns
  try {
    const [row] = await db
      .insert(ContextTable)
      .values({
        name: name || 'Untitled Context',
        content: JSON.stringify(payload), // <— store the JSON payload here
        tags: finalTags,
        description, // short blurb
        createdBy: session.user.id as string,
        createdAt: new Date(),
      })
      .returning();

    // Bonus: return parsed payload to client so UI can use it immediately
    return NextResponse.json({ context: row, payload }, { status: 201 });
  } catch {
    return new ChatSDKError('bad_request:database', 'Failed to generate context').toResponse();
  }
}

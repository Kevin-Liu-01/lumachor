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

function generatorPrompt(userPrompt: string, tags: string[]) {
  return `You are an expert prompt engineer whose sole task is to craft a high-quality “context template” for a downstream chatbot.

User’s request:
“${userPrompt}”

Selected tags: ${tags.join(', ') || '(none)'}

─── INSTRUCTIONS ───
Using the user’s request and tags, generate a context that includes:

1. **Title**
   A concise, descriptive name (3–6 words) reflecting the user’s goal.

2. **Description**
   A one-paragraph overview of what the chatbot should know or achieve.

3. **Background & Goals**
   • Key facts or assumptions the bot needs.
   • Primary objectives it should focus on.

4. **Tone & Style**
   • Desired voice (e.g., friendly, professional, witty).
   • Any formatting guidelines (e.g., bullet lists, step-by-step).

5. **Constraints & Scope**
   • Things to avoid or ignore.
   • Contextual limits (e.g., domain knowledge, length).

6. **Example Prompts**
   • Two sample user messages that demonstrate how this context should be used.

─── OUTPUT FORMAT ───
Return only the context payload in plain text or markdown. Do not include any additional commentary.

---
Begin!`;
}

function tagPromptFromContext(contextText: string) {
  return `You are labeling a prompt context for retrieval. 
Return 3–6 short, lowercase, single-word tags that best categorize this context (no punctuation, no sentences). 
Output MUST be a comma-separated list only (e.g. "coding, customer-support, tutor").

CONTEXT:
${contextText.slice(0, 4000)}
`;
}

function cleanTitle(raw: string) {
  return raw.replace(/^\s*(?:\*\*Title\*\*|#+)\s*/i, '').trim();
}

export async function POST(req: Request) {
  // 1) Auth
  const session = await auth();
  if (!session?.user?.id) {
    return new ChatSDKError('unauthorized:chat').toResponse();
  }

  // 2) Validate
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

  // 4) Generate with myProvider (xAI-only)
  const { userPrompt, tags } = parsed;
  const modelId = parsed.model ?? 'chat-model'; // xAI via myProvider
  const prompt = generatorPrompt(userPrompt, tags);

  let text: string;
  try {
    const result = await generateText({
      model: myProvider.languageModel(modelId),
      system: 'Return only the requested context payload. No extra commentary.',
      prompt,
      temperature: 0.4,
    });
    text = result.text;
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

  // 5) Derive name (strip "**Title:**" / headings); description may be empty and that's fine.
  const firstNonEmpty = text.split('\n').map((l) => l.trim()).find(Boolean) ?? 'Untitled Context';
  const name = cleanTitle(firstNonEmpty).slice(0, 80);

  // 6) Auto-generate tags if caller provided none
  let finalTags = (tags || []).filter(Boolean);
  if (finalTags.length === 0) {
    try {
      const tagResult = await generateText({
        model: myProvider.languageModel('title-model'),
        system: 'Output only a comma-separated list of 3–6 short lowercase tags.',
        prompt: tagPromptFromContext(text),
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

  // 7) Insert (store full context as `content`)
  try {
    const [row] = await db
      .insert(ContextTable)
      .values({
        name: name || 'Untitled Context',
        content: text,      // full structured context lives here
        tags: finalTags,    // auto-generated if missing
        description: '',    // many contexts won't have a short desc; fine to keep empty
        createdBy: session.user.id as string,
        createdAt: new Date(),
      })
      .returning();

    return NextResponse.json({ context: row }, { status: 201 });
  } catch {
    return new ChatSDKError('bad_request:database', 'Failed to generate context').toResponse();
  }
}

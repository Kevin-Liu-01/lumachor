import 'server-only';

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/app/(auth)/auth';
import { ChatSDKError } from '@/lib/errors';

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { and, ilike, eq, inArray, desc, sql } from 'drizzle-orm';
import {
  context as ContextTable,
  contextStar as ContextStar,
  type Context,
  user as UserTable,
} from '@/lib/db/schema';

function getDb() {
  const client = postgres(process.env.POSTGRES_URL!);
  return drizzle(client);
}

const CreateBody = z.object({
  name: z.string().min(2),
  content: z.string().min(10),
  tags: z.array(z.string()).default([]),
  description: z.string().optional(),
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

function truthyParam(v: string | null) {
  if (!v) return false;
  const s = v.toLowerCase();
  return s === '1' || s === 'true' || s === 'yes';
}

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) return new ChatSDKError('unauthorized:chat').toResponse();

    const { searchParams } = new URL(req.url);
    const q = (searchParams.get('q') || '').trim();
    const tag = (searchParams.get('tag') || '').trim();
    const mine = truthyParam(searchParams.get('mine'));
    const starred = truthyParam(searchParams.get('starred'));
    const withMeta = truthyParam(searchParams.get('withMeta')) || searchParams.get('withMeta') === '1';

    const db = getDb();

    const conds: any[] = [];
    if (q) {
      const pattern = `%${q}%`;
      conds.push(sql`(${ilike(ContextTable.name, pattern)} OR ${ilike(ContextTable.description, pattern)})`);
    }
    if (tag) {
      conds.push(sql`${tag} = ANY(${ContextTable.tags})`);
    }
    // enforce owner scoping
    if (mine || starred) {
      conds.push(eq(ContextTable.createdBy, session.user.id as string));
    }

    const rows = await db
      .select()
      .from(ContextTable)
      .where(conds.length ? and(...conds) : undefined)
      .orderBy(desc(ContextTable.createdAt))
      .limit(200);

    if (!withMeta) {
      // Rare in your app, but keep behavior intact.
      return NextResponse.json({ contexts: rows as Context[] });
    }

    // annotate liked + owner for the current user
    const ids = rows.map((r) => r.id);
    let likedSet = new Set<string>();
    if (ids.length) {
      const stars = await db
        .select()
        .from(ContextStar)
        .where(and(
          eq(ContextStar.userId as any, session.user.id as string),
          inArray(ContextStar.contextId as any, ids as any[]),
        ));
      likedSet = new Set(stars.map((s) => s.contextId));
    }

    let out = rows.map((r) => ({
      ...r,
      liked: likedSet.has(r.id),
      owner: r.createdBy === (session.user.id as string),
    }));

    // Starred scope: only contexts you own AND you have starred
    if (starred) {
      out = out.filter((r) => r.owner && r.liked);
    }

    return NextResponse.json({ contexts: out });
  } catch (e) {
    console.error('[GET /api/contexts] error:', e);
    return new ChatSDKError('bad_request:database', 'Failed to list contexts').toResponse();
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) return new ChatSDKError('unauthorized:chat').toResponse();

    const json = await req.json();
    const body = CreateBody.parse(json);

    const db = getDb();
    await ensureUser(db, { id: session.user.id as string, email: session.user.email ?? null });

    const [row] = await db
      .insert(ContextTable)
      .values({
        name: body.name,
        content: body.content,
        tags: (body.tags || []).map((t) => t.toLowerCase()),
        description: body.description ?? '',
        createdBy: session.user.id as string,
        createdAt: new Date(),
      })
      .returning();

    return NextResponse.json({ context: row }, { status: 201 });
  } catch (err: any) {
    console.error('[POST /api/contexts] error:', err);
    if (err?.issues) {
      return new ChatSDKError('bad_request:api', 'Invalid request body').toResponse();
    }
    return new ChatSDKError('bad_request:database', 'Failed to create context').toResponse();
  }
}

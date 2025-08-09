// app/api/public-contexts/route.ts
import 'server-only';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/app/(auth)/auth';
import { ChatSDKError } from '@/lib/errors';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { and, or, ilike, inArray, sql, desc, eq } from 'drizzle-orm';
import { context as Context, publicContext as PublicContext } from '@/lib/db/schema';

function getDb() {
  const client = postgres(process.env.POSTGRES_URL!);
  return drizzle(client);
}

const PublishBody = z.object({
  contextId: z.string().min(1),
});

export async function GET(req: Request) {
  try {
    const session = await auth(); // guests allowed
    const { searchParams } = new URL(req.url);
    const q = (searchParams.get('q') || '').trim();
    const tag = (searchParams.get('tag') || '').trim();

    const db = getDb();

    // fetch latest published refs
    const pubs = await db
      .select()
      .from(PublicContext)
      .orderBy(desc(PublicContext.createdAt))
      .limit(200);

    const contextIds = pubs.map((p) => p.contextId);
    if (contextIds.length === 0) {
      return NextResponse.json({ contexts: [] });
    }

    // Build predicates safely to avoid SQL<unknown> | undefined
    const clauses: any[] = [inArray(Context.id, contextIds)];

    if (q) {
      const pattern = `%${q}%`;
      clauses.push(or(ilike(Context.name, pattern), ilike(Context.description, pattern)));
    }

    if (tag) {
      // tags @> ARRAY[$tag]::text[]
      clauses.push(sql<boolean>`${Context.tags} @> ARRAY[${tag}]::text[]`);
    }

    const whereExpr = and(...clauses);

    const rows = await db
      .select()
      .from(Context)
      .where(whereExpr)
      .orderBy(desc(Context.createdAt))
      .limit(200);

    const pubByContextId = new Map(pubs.map((p) => [p.contextId, p]));
    const out = rows.map((r) => {
      const pub = pubByContextId.get(r.id);
      return {
        ...r,
        publicId: pub?.id ?? null,
        publisherId: pub?.createdBy ?? null,
        publishedAt: pub?.createdAt ?? null,
        owner: session?.user?.id ? r.createdBy === (session.user.id as string) : false,
      };
    });

    return NextResponse.json({ contexts: out });
  } catch {
    return new ChatSDKError('bad_request:database', 'Failed to load public contexts').toResponse();
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) return new ChatSDKError('unauthorized:chat').toResponse();

    const db = getDb();
    const { contextId } = PublishBody.parse(await req.json());

    const [ctx] = await db.select().from(Context).where(eq(Context.id, contextId)).limit(1);
    if (!ctx) return new ChatSDKError('bad_request:api', 'Context not found').toResponse();
    if (ctx.createdBy !== session.user.id) {
      return new ChatSDKError('unauthorized:chat', 'You can only publish your own context').toResponse();
    }

    const [existing] = await db.select().from(PublicContext).where(eq(PublicContext.contextId, contextId)).limit(1);
    if (existing) return NextResponse.json({ publicId: existing.id }, { status: 200 });

    const [pub] = await db
      .insert(PublicContext)
      .values({
        id: crypto.randomUUID(),
        contextId,
        createdBy: session.user.id as string,
        createdAt: new Date(),
      })
      .returning();

    return NextResponse.json({ publicId: pub.id }, { status: 201 });
  } catch (err: any) {
    if (err?.issues) return new ChatSDKError('bad_request:api', 'Invalid request body').toResponse();
    return new ChatSDKError('bad_request:database', 'Failed to publish context').toResponse();
  }
}

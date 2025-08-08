import 'server-only';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/app/(auth)/auth';
import { ChatSDKError } from '@/lib/errors';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { and, eq, ilike, inArray, sql } from 'drizzle-orm';
import { context as Context, publicContext as PublicContext, user as User } from '@/lib/db/schema';

function getDb() {
  const client = postgres(process.env.POSTGRES_URL!);
  return drizzle(client);
}

const PublishBody = z.object({
  contextId: z.string().min(1),
});

export async function GET(req: Request) {
  try {
    const session = await auth();
    // Guests can browse public library; require auth only if you want to gate
    const { searchParams } = new URL(req.url);
    const q = (searchParams.get('q') || '').trim();
    const tag = (searchParams.get('tag') || '').trim();

    const db = getDb();

    // Join public_context -> context to return full data
    // Drizzle doesn't do "joins" with a one-liner select*, so do manual steps
    const pubs = await db.select().from(PublicContext).orderBy(sql`${PublicContext.createdAt} DESC`).limit(200);
    const contextIds = pubs.map(p => p.contextId);
    if (contextIds.length === 0) return NextResponse.json({ contexts: [] });

    // Fetch all contexts referenced by public entries
    let where = inArray(Context.id, contextIds);

    // Text search
    if (q) {
      const pattern = `%${q}%`;
      where = and(
        where,
        sql`(${ilike(Context.name, pattern)} OR ${ilike(Context.description, pattern)})`
      );
    }
    // Tag filter
    if (tag) {
      where = and(where, sql`${tag} = ANY(${Context.tags})`);
    }

    const rows = await db
      .select()
      .from(Context)
      .where(where)
      .orderBy(sql`${Context.createdAt} DESC`)
      .limit(200);

    // Build map of publicId for each context
    const pubByContextId = new Map(pubs.map(p => [p.contextId, p]));
    const out = rows.map(r => ({
      ...r,
      publicId: pubByContextId.get(r.id)?.id,
      publisherId: pubByContextId.get(r.id)?.createdBy,
      publishedAt: pubByContextId.get(r.id)?.createdAt,
      // whether current user is owner of original
      owner: session?.user?.id ? r.createdBy === (session.user.id as string) : false,
    }));

    return NextResponse.json({ contexts: out });
  } catch (e) {
    return new ChatSDKError('bad_request:database', 'Failed to load public contexts').toResponse();
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return new ChatSDKError('unauthorized:chat').toResponse();
    }
    const db = getDb();

    const body = PublishBody.parse(await req.json());
    const contextId = body.contextId;

    // Verify context exists and belongs to publisher
    const [ctx] = await db.select().from(Context).where(eq(Context.id, contextId)).limit(1);
    if (!ctx) return new ChatSDKError('bad_request:api', 'Context not found').toResponse();
    if (ctx.createdBy !== session.user.id) {
      return new ChatSDKError('unauthorized:chat', 'You can only publish your own context').toResponse();
    }

    // Prevent duplicates: check if already published
    const [existing] = await db.select().from(PublicContext).where(eq(PublicContext.contextId, contextId)).limit(1);
    if (existing) {
      return NextResponse.json({ publicId: existing.id }, { status: 200 });
    }

    const [pub] = await db.insert(PublicContext).values({
      id: crypto.randomUUID(),
      contextId,
      createdBy: session.user.id as string,
      createdAt: new Date(),
    }).returning();

    return NextResponse.json({ publicId: pub.id }, { status: 201 });
  } catch (err: any) {
    if (err?.issues) {
      return new ChatSDKError('bad_request:api', 'Invalid request body').toResponse();
    }
    return new ChatSDKError('bad_request:database', 'Failed to publish context').toResponse();
  }
}

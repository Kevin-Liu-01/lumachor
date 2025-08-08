// app/api/contexts/[id]/route.ts
import 'server-only';
import { NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import { ChatSDKError } from '@/lib/errors';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { and, eq } from 'drizzle-orm';
import {
  context as ContextTable,
  contextStar as ContextStar,
} from '@/lib/db/schema';

function getDb() {
  const client = postgres(process.env.POSTGRES_URL!);
  return drizzle(client);
}

// Toggle like (star/unstar)
export async function PATCH(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) return new ChatSDKError('unauthorized:chat').toResponse();

    const db = getDb();
    const userId = session.user.id as string;
    const contextId = params.id;

    // check existing star
    const [existing] = await db
      .select()
      .from(ContextStar)
      .where(and(eq(ContextStar.userId as any, userId), eq(ContextStar.contextId as any, contextId)))
      .limit(1);

    if (existing) {
      await db
        .delete(ContextStar)
        .where(and(eq(ContextStar.userId as any, userId), eq(ContextStar.contextId as any, contextId)));
      return NextResponse.json({ liked: false });
    } else {
      await db
        .insert(ContextStar)
        .values({ userId: userId as any, contextId: contextId as any });
      return NextResponse.json({ liked: true });
    }
  } catch (e) {
    console.error('[PATCH /api/contexts/:id] error:', e);
    return new ChatSDKError('bad_request:database', 'Failed to toggle star').toResponse();
  }
}

// Delete a context you own
export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) return new ChatSDKError('unauthorized:chat').toResponse();

    const db = getDb();
    const userId = session.user.id as string;

    const result = await db
      .delete(ContextTable)
      .where(and(eq(ContextTable.id, params.id), eq(ContextTable.createdBy, userId)))
      .returning();

    const deleted = result.length > 0;
    return NextResponse.json({ deleted });
  } catch (e) {
    console.error('[DELETE /api/contexts/:id] error:', e);
    return new ChatSDKError('bad_request:database', 'Failed to delete context').toResponse();
  }
}

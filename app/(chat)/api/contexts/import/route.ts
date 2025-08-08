import 'server-only';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/app/(auth)/auth';
import { ChatSDKError } from '@/lib/errors';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { and, eq, sql } from 'drizzle-orm';
import { context as Context, publicContext as PublicContext } from '@/lib/db/schema';

function getDb() {
  const client = postgres(process.env.POSTGRES_URL!);
  return drizzle(client);
}

const ImportBody = z.object({
  publicId: z.string().min(1),
});

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return new ChatSDKError('unauthorized:chat').toResponse();
    }

    const body = ImportBody.parse(await req.json());
    const db = getDb();

    // Locate public entry
    const [pub] = await db.select().from(PublicContext).where(eq(PublicContext.id, body.publicId)).limit(1);
    if (!pub) return new ChatSDKError('bad_request:api', 'Public context not found').toResponse();

    // Load original context
    const [src] = await db.select().from(Context).where(eq(Context.id, pub.contextId)).limit(1);
    if (!src) return new ChatSDKError('bad_request:api', 'Source context missing').toResponse();

    // Duplicate into user's library
    const [row] = await db.insert(Context).values({
      id: crypto.randomUUID(),
      name: src.name,
      content: src.content,
      tags: src.tags,
      description: src.description,
      createdBy: session.user.id as string,
      createdAt: new Date(),
    }).returning();

    return NextResponse.json({ context: row }, { status: 201 });
  } catch (err: any) {
    if (err?.issues) {
      return new ChatSDKError('bad_request:api', 'Invalid request body').toResponse();
    }
    return new ChatSDKError('bad_request:database', 'Failed to import context').toResponse();
  }
}

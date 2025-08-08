import 'server-only';

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/app/(auth)/auth';
import { ChatSDKError } from '@/lib/errors';

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { and, ilike, eq, sql } from 'drizzle-orm';
import {
  context as ContextTable,
  type Context,
  user as UserTable,
} from '@/lib/db/schema';

// Route-scoped Drizzle client
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

  const safeEmail =
    email && email.length <= 64 ? email : `guest-${Date.now()}`;

  const [created] = await db
    .insert(UserTable)
    .values({ id, email: safeEmail })
    .returning();
  return created;
}

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return new ChatSDKError('unauthorized:chat').toResponse();
    }

    const { searchParams } = new URL(req.url);
    const q = (searchParams.get('q') || '').trim();
    const tag = (searchParams.get('tag') || '').trim();
    const mine = searchParams.get('mine') === 'true';

    const db = getDb();

    const where: any[] = [];
    if (q) {
      where.push(
        sql`(${ilike(ContextTable.name, '%' + q + '%')} OR ${ilike(
          ContextTable.description,
          '%' + q + '%',
        )})`,
      );
    }
    if (tag) {
      where.push(sql`${tag} = ANY(${ContextTable.tags})`);
    }
    if (mine && session.user.id) {
      where.push(eq(ContextTable.createdBy, session.user.id as string));
    }

    const rows = await db
      .select()
      .from(ContextTable)
      .where(where.length ? and(...where) : undefined)
      .orderBy(sql`${ContextTable.createdAt} DESC`)
      .limit(50);

    return NextResponse.json({ contexts: rows as Context[] });
  } catch {
    return new ChatSDKError(
      'bad_request:database',
      'Failed to list contexts',
    ).toResponse();
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return new ChatSDKError('unauthorized:chat').toResponse();
    }

    const json = await req.json();
    const body = CreateBody.parse(json);

    const db = getDb();
    await ensureUser(db, {
      id: session.user.id as string,
      email: session.user.email ?? null,
    });

    const [row] = await db
      .insert(ContextTable)
      .values({
        name: body.name,
        content: body.content,
        tags: body.tags || [],
        description: body.description ?? '',
        createdBy: session.user.id as string,
        createdAt: new Date(),
      })
      .returning();

    return NextResponse.json({ context: row }, { status: 201 });
  } catch (err: any) {
    if (err?.issues) {
      return new ChatSDKError('bad_request:api', 'Invalid request body').toResponse();
    }
    return new ChatSDKError(
      'bad_request:database',
      'Failed to create context',
    ).toResponse();
  }
}

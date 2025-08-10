// app/api/public-contexts/[id]/route.ts
import 'server-only';
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import { ChatSDKError } from '@/lib/errors';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { eq } from 'drizzle-orm';
import { context as Context, publicContext as PublicContext } from '@/lib/db/schema';

function getDb() {
  const client = postgres(process.env.POSTGRES_URL!);
  return drizzle(client);
}

type RouteContext = { params: { id: string } };

export async function DELETE(_req: NextRequest, { params }: RouteContext) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return new ChatSDKError('unauthorized:chat').toResponse();
    }

    const db = getDb();
    const publicId = params.id;

    // find the public entry
    const [pub] = await db
      .select()
      .from(PublicContext)
      .where(eq(PublicContext.id, publicId))
      .limit(1);

    if (!pub) {
      return new ChatSDKError('bad_request:database', 'Public context not found').toResponse();
    }

    // fetch its source context to validate ownership
    const [ctx] = await db
      .select()
      .from(Context)
      .where(eq(Context.id, pub.contextId))
      .limit(1);

    if (!ctx) {
      return new ChatSDKError('bad_request:database', 'Source context not found').toResponse();
    }

    const userId = session.user.id as string;

    // allow the publisher OR the original context owner to unpublish
    if (pub.createdBy !== userId && ctx.createdBy !== userId) {
      return new ChatSDKError('unauthorized:chat', 'You can only unpublish your own context').toResponse();
    }

    await db.delete(PublicContext).where(eq(PublicContext.id, publicId));

    return new NextResponse(null, { status: 204 });
  } catch {
    return new ChatSDKError('bad_request:database', 'Failed to unpublish context').toResponse();
  }
}

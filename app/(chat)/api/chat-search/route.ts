// app/api/chat-search/route.ts
import { NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import { searchChats } from '@/lib/db/queries';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const q = (searchParams.get('q') || '').trim();
  const limit = Math.min(Math.max(Number(searchParams.get('limit') || 25), 1), 100);

  if (!q) {
    return NextResponse.json({ results: [] });
  }

  const results = await searchChats({ userId: session.user.id, q, limit });

  return NextResponse.json({
    results: results.map(r => ({
      id: r.id,
      title: r.title,
      createdAt: r.createdAt,
      lastMessageAt: r.lastMessageAt ?? r.createdAt,
    })),
  });
}

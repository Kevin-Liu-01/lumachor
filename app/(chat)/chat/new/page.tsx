// app/chat/new/page.tsx
import { redirect } from 'next/navigation';
import { auth } from '@/app/(auth)/auth';

export default async function NewChatPage(props: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await auth();
  if (!session) {
    // your guest route will bounce back to /
    redirect('/api/auth/guest');
  }

  // PPR/async props: await searchParams
  const sp = await props.searchParams;
  const contextId = typeof sp?.context === 'string' ? sp.context : undefined;

  // No DB write. Just go to the empty chat screen with context applied.
  redirect(contextId ? `/?context=${encodeURIComponent(contextId)}` : '/');
}

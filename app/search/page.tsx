import Search from '@/components/search';

export const dynamic = 'force-dynamic';

export default function Page() {
  // If you need auth, add it here and pass session/user props down.
  return <Search />;
}

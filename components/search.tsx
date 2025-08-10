'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import useSWR from 'swr';
import { useRouter, useSearchParams } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import cx from 'classnames';
import {
  Search as SearchIcon,
  ArrowRight,
  LayoutGrid,
  LayoutList,
  ArrowUpDown,
  Filter,
  Sparkles,
  X,
  CalendarClock,
  History,
  MessageSquare,
  Wand2,
  Clock,
  Loader2,
  TextSearchIcon,
} from 'lucide-react';

import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { Skeleton } from '@/components/ui/skeleton';
import { ShimmerOverlay, TopStripeLoader } from '@/components/ui/shimmer';
import { fetcher } from '@/lib/utils';
import LumachorMark from './lumachormark';

type Result = { id: string; title: string; createdAt: string; lastMessageAt: string };
type ViewMode = 'grid' | 'list';
type SortKey = 'recent' | 'title';
type Range = '24h' | '7d' | '30d' | 'all';

function useDebounced<T>(value: T, delay = 250) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

function highlight(text: string, q: string) {
  if (!q.trim()) return text;
  const i = text.toLowerCase().indexOf(q.toLowerCase());
  if (i < 0) return text;
  return (
    <>
      {text.slice(0, i)}
      <mark className="rounded px-0.5 bg-amber-500/30">{text.slice(i, i + q.length)}</mark>
      {text.slice(i + q.length)}
    </>
  );
}

export default function SearchPage() {
  const router = useRouter();
  const sp = useSearchParams();

  // URL-driven initial state
  const initialQ = sp.get('q') || '';
  const [q, setQ] = useState(initialQ);
  const dq = useDebounced(q, 250);

  const [view, setView] = useState<ViewMode>((sp.get('view') as ViewMode) || 'grid');
  const [sort, setSort] = useState<SortKey>((sp.get('sort') as SortKey) || 'recent');
  const [range, setRange] = useState<Range>((sp.get('range') as Range) || 'all');

  // SWR fetch (only when we have a debounced query)
  const { data, isLoading } = useSWR<{ results: Result[] }>(
    dq ? `/api/chat-search?q=${encodeURIComponent(dq)}` : null,
    fetcher
  );

  // client filters/sorts
  const filtered = useMemo(() => {
    const src = data?.results ?? [];
    const now = Date.now();

    const within = (ts: string) => {
      const t = new Date(ts).getTime();
      switch (range) {
        case '24h': return now - t <= 24 * 3600 * 1000;
        case '7d':  return now - t <= 7 * 24 * 3600 * 1000;
        case '30d': return now - t <= 30 * 24 * 3600 * 1000;
        default:    return true;
      }
    };

    let arr = src.filter(r => within(r.lastMessageAt || r.createdAt));
    if (sort === 'title') {
      arr = [...arr].sort((a, b) => (a.title || '').localeCompare(b.title || ''));
    } else {
      arr = [...arr].sort(
        (a, b) =>
          new Date(b.lastMessageAt || b.createdAt).getTime() -
          new Date(a.lastMessageAt || a.createdAt).getTime()
      );
    }
    return arr;
  }, [data?.results, sort, range]);

  // open chat
  const onOpen = useCallback((id: string) => {
    router.push(`/chat/${id}`);
  }, [router]);

  // Enter -> open first
  const listRef = useRef<HTMLUListElement>(null);
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && filtered.length > 0) {
        e.preventDefault();
        onOpen(filtered[0].id);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [filtered, onOpen]);

  // quick chips
  const chips = ['todo', 'bug', 'design', 'plan', 'meeting', 'docs', 'draft', 'summary'];

  // sync URL (q/view/sort/range)
  useEffect(() => {
    const params = new URLSearchParams();
    if (q.trim()) params.set('q', q.trim());
    if (view !== 'grid') params.set('view', view);
    if (sort !== 'recent') params.set('sort', sort);
    if (range !== 'all') params.set('range', range);
    const qs = params.toString();
    router.replace(qs ? `/search?${qs}` : '/search');
  }, [q, view, sort, range, router]);

  const resultsLabel = dq
    ? (isLoading ? 'Searching…' : `${filtered.length} result${filtered.length === 1 ? '' : 's'}`)
    : 'Type to search';

  return (
    <TooltipProvider delayDuration={0}>
      <div className="relative min-h-dvh">
        {/* Ambient glows */}
        <div className="pointer-events-none absolute -top-24 -left-24 size-80 rounded-full bg-indigo-500/15 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -right-24 size-96 rounded-full bg-fuchsia-500/15 blur-3xl" />

        {/* HERO */}
        <section className="relative border-b bg-background/70 backdrop-blur">
          <TopStripeLoader show={!!isLoading} />

          {/* Header */}
          <div className="mx-auto max-w-7xl px-4 py-8">
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
              <div className="flex items-end justify-between gap-4">
                <div className="min-w-0">
                  <div className="inline-flex items-center gap-2">
                    <div className="relative">
                      <div className="absolute -inset-2 rounded-xl bg-gradient-to-tr from-indigo-500/25 to-fuchsia-500/25 blur-xl" />
                      <div className="relative grid place-items-center rounded-xl border bg-background/80 border-indigo-500/30 text-indigo-600 size-10 shadow-sm">
                        <TextSearchIcon className="size-5" />
                      </div>
                    </div>
                    <h1 className="text-xl md:text-2xl font-extrabold tracking-tight">Search your Chats</h1>
                  </div>
                  <p className="mt-1 text-sm md:text-base opacity-70">
                    Find any chat by title or message content. Press{' '}
                    <kbd className="px-1.5 py-0.5 rounded border bg-background/80">Enter</kbd> to open the top hit.
                  </p>
                </div>

                <div className="hidden md:flex items-center gap-2 text-sm">
                  {isLoading ? <Loader2 className="size-4 animate-spin opacity-70" /> : <Sparkles className="size-4 opacity-70" />}
                  <span className="opacity-70" aria-live="polite">{resultsLabel}</span>
                </div>
              </div>

              {/* Jumbo search bar (NO OVERLAP: grid layout) */}
              <div className="mt-6">
                <form
                  role="search"
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (filtered[0]) onOpen(filtered[0].id);
                  }}
                  className={cx(
                    'rounded-2xl border bg-background/80 backdrop-blur shadow-sm',
                    'grid grid-cols-[auto,1fr,auto,auto] items-center gap-2 px-2',
                    'h-14 md:h-16'
                  )}
                >
                  {/* icon */}
                  <div className="pl-2">
                    <SearchIcon className="size-5 opacity-60" />
                  </div>

                  {/* input */}
                  <Input
                    autoFocus
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="Search by keywords…"
                    className="h-full border-0 bg-transparent focus-visible:ring-0 focus-visible:outline-none px-0 text-base md:text-lg"
                    aria-label="Search chats"
                  />

                  {/* clear */}
                  {q ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-9"
                      onClick={() => setQ('')}
                      aria-label="Clear search"
                      title="Clear"
                    >
                      <X className="size-4" />
                      <span className="ml-1 hidden sm:inline">Clear</span>
                    </Button>
                  ) : (
                    <span className="h-9" />
                  )}

                  {/* open top hit */}
                  <Button
                    type="submit"
                    className="h-10 md:h-12 px-4"
                    disabled={!dq || filtered.length === 0 || isLoading}
                    aria-label="Open top hit"
                    title={(!dq || filtered.length === 0) ? 'Type to search' : 'Open top hit'}
                  >
                    {isLoading ? <Loader2 className="mr-2 size-4 animate-spin" /> : <SearchIcon className="mr-2 size-4" />}
                    <span className="hidden sm:inline">{isLoading ? 'Searching…' : 'Open top hit'}</span>
                  </Button>

                  {/* subtle shimmer while loading */}
                  <ShimmerOverlay show={!!isLoading} />
                </form>

                {/* Quick chips */}
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {chips.map((c) => (
                    <button
                      key={c}
                      onClick={() => setQ(c)}
                      className="rounded-full border px-3 py-1 text-xs transition hover:bg-foreground/[0.04] bg-background/70"
                      title={`Search "${c}"`}
                    >
                      #{c}
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>

          {/* Sticky controls (cleaner groups) */}
          <div className="sticky top-0 z-10 border-t bg-background/70 backdrop-blur">
            <div className="mx-auto max-w-7xl px-4 py-2 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                {/* view group */}
                <div className="inline-flex items-center gap-1 rounded-xl border p-1 bg-background/60">
                  <Button
                    variant={view === 'grid' ? 'default' : 'ghost'}
                    size="sm"
                    className="h-8"
                    onClick={() => setView('grid')}
                  >
                    <LayoutGrid className="mr-2 size-4" /> Grid
                  </Button>
                  <Button
                    variant={view === 'list' ? 'default' : 'ghost'}
                    size="sm"
                    className="h-8"
                    onClick={() => setView('list')}
                  >
                    <LayoutList className="mr-2 size-4" /> List
                  </Button>
                </div>

                {/* sort & range */}
                <div className="hidden md:flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8"
                    onClick={() => setSort(sort === 'recent' ? 'title' : 'recent')}
                    title="Toggle sort"
                  >
                    <ArrowUpDown className="mr-2 size-4" />
                    {sort === 'recent' ? 'Recent' : 'Title'}
                  </Button>

                  <div className="inline-flex items-center rounded-xl border bg-background/60 pl-1">
                    {(['24h', '7d', '30d', 'all'] as Range[]).map((r) => (
                      <Button
                        key={r}
                        size="sm"
                        variant={range === r ? 'default' : 'ghost'}
                        className="h-8 px-3"
                        onClick={() => setRange(r)}
                        aria-pressed={range === r}
                        title={r === 'all' ? 'All time' : r}
                      >
                        {r === 'all' ? <CalendarClock className="mr-2 size-3.5" /> : <Clock className="mr-2 size-3.5" />}
                        {r === 'all' ? 'All' : r}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="text-xs opacity-70 inline-flex items-center gap-2" aria-live="polite">
                {isLoading ? <Loader2 className="size-3.5 animate-spin" /> : <History className="size-3.5" />}
                <span>{resultsLabel}</span>
              </div>
            </div>
          </div>
        </section>

        {/* RESULTS */}
        <main className="mx-auto max-w-7xl p-4 md:p-6">
          <AnimatePresence initial={false} mode="popLayout">
            {!dq ? (
              /* Idle / "start typing" state — richer & helpful */
              <motion.div
                key="idle"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                className="relative overflow-hidden rounded-2xl border bg-background/60 backdrop-blur p-0"
              >
                {/* gradient frame */}
                <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-indigo-500/10 via-fuchsia-500/40 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 h-0.5 bg-gradient-to-r from-indigo-500/10 via-fuchsia-500/40 to-transparent" />
                <div className="p-6 md:p-8 lg:p-16">
                  <div className="mx-auto max-w-3xl text-center">
                    <div className="mx-auto grid place-items-center mb-4">
                      <div className="relative">
                        <div className="absolute -inset-4 rounded-2xl bg-gradient-to-tr from-indigo-500/20 to-fuchsia-500/20 blur-xl" />
                        <div className="relative grid place-items-center rounded-xl border bg-background/80 border-indigo-500/30 text-indigo-600 size-12 shadow-sm">
                          <LumachorMark variant="white"/>
                        </div>
                      </div>
                    </div>
                    <h2 className="text-lg md:text-xl font-semibold">Start typing to search your chats</h2>
                    <p className="mt-1 text-sm opacity-70">
                      Search across titles and content. Try a keyword like <span className="font-medium">“summary”</span> or <span className="font-medium">“meeting”</span>.
                    </p>

                    {/* Helpful quick actions */}
                    <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-2 text-left">
                      <div className="rounded-xl border p-3 bg-background/60">
                        <div className="flex items-center gap-2 text-xs font-medium">
                          <MessageSquare className="size-3.5 opacity-70" />
                          Search titles & content
                        </div>
                        <div className="text-[11px] opacity-70 mt-1">Results update live as you type.</div>
                      </div>
                      <div className="rounded-xl border p-3 bg-background/60">
                        <div className="flex items-center gap-2 text-xs font-medium">
                          <History className="size-3.5 opacity-70" />
                          Filter by recency
                        </div>
                        <div className="text-[11px] opacity-70 mt-1">Use 24h / 7d / 30d / All.</div>
                      </div>
                      <div className="rounded-xl border p-3 bg-background/60">
                        <div className="flex items-center gap-2 text-xs font-medium">
                          <Wand2 className="size-3.5 opacity-70" />
                          Open the top hit
                        </div>
                        <div className="text-[11px] opacity-70 mt-1">
                          Press <kbd className="px-1 py-0.5 rounded border">Enter</kbd> to jump in.
                        </div>
                      </div>
                    </div>

                    {/* Suggestion chips */}
                    <div className="mt-4 flex flex-wrap justify-center gap-1.5">
                      {chips.map((c) => (
                        <button
                          key={c}
                          onClick={() => setQ(c)}
                          className="inline-flex items-center rounded-full border px-3 py-1 text-[11px] transition hover:bg-foreground/5"
                          title={`Search "${c}"`}
                          style={{ background: 'hsl(262 85% 45% / 0.06)' }}
                        >
                          #{c}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

              </motion.div>
            ) : isLoading ? (
              <motion.ul
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className={cx(view === 'grid' ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3' : 'space-y-2')}
                aria-busy
              >
                {Array.from({ length: view === 'grid' ? 9 : 6 }).map((_, i) => (
                  <li key={i} className="relative rounded-2xl border p-4 bg-background/60 overflow-hidden">
                    <ShimmerOverlay show />
                    <div className="flex items-start gap-3">
                      <Skeleton className="size-8 rounded-lg" />
                      <div className="min-w-0 flex-1">
                        <Skeleton className="h-4 w-1/2 mb-2" />
                        <Skeleton className="h-3 w-4/5 mb-1.5" />
                        <Skeleton className="h-3 w-3/5" />
                      </div>
                    </div>
                    <div className="mt-3 flex items-center justify-between">
                      <Skeleton className="h-8 w-24 rounded-md" />
                      <Skeleton className="size-8 rounded-md" />
                    </div>
                  </li>
                ))}
              </motion.ul>
            ) : filtered.length === 0 ? (
              <motion.div
                key="empty"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                className="relative rounded-2xl border bg-background/60 backdrop-blur p-10 text-center overflow-hidden"
              >
                <div className="absolute -top-24 -right-24 size-64 rounded-full bg-fuchsia-500/10 blur-3xl" />
                <div className="absolute -bottom-24 -left-24 size-64 rounded-full bg-indigo-500/10 blur-3xl" />
                <div className="relative mx-auto size-12 rounded-full border grid place-items-center mb-3 bg-background/70">
                  <Filter className="size-5 opacity-70" />
                </div>
                <div className="font-medium">No matches</div>
                <div className="text-sm opacity-70 mt-1">Try different keywords or date range.</div>
                <div className="mt-4 inline-flex flex-wrap justify-center gap-1.5">
                  {chips.slice(0, 5).map((c) => (
                    <button
                      key={c}
                      onClick={() => setQ(c)}
                      className="rounded-full border px-3 py-1 text-xs transition hover:bg-foreground/[0.04] bg-background/70"
                    >
                      #{c}
                    </button>
                  ))}
                </div>
              </motion.div>
            ) : view === 'grid' ? (
              <motion.ul
                key="grid"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3"
              >
                {filtered.map((r) => {
                  const when = new Date(r.lastMessageAt || r.createdAt);
                  const title = r.title || 'Untitled chat';
                  return (
                    <li key={r.id}>
                      <button
                        onClick={() => onOpen(r.id)}
                        className="w-full text-left rounded-2xl border p-4 bg-background/70 hover:bg-background/90 transition group relative"
                      >
                        <div className="flex items-start gap-3 min-w-0">
                          <div className="grid place-items-center rounded-lg border size-8 shrink-0">
                            <MessageSquare className="size-4 opacity-70" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="font-medium truncate">{highlight(title, dq)}</div>
                            <div className="text-xs opacity-70 mt-0.5 inline-flex items-center gap-1">
                              <History className="size-3.5" />
                              Last activity {when.toLocaleString()}
                            </div>
                          </div>
                          <ArrowRight className="size-4 opacity-0 group-hover:opacity-80 transition shrink-0" />
                        </div>
                        <span className="pointer-events-none absolute inset-0 rounded-2xl ring-0 ring-indigo-500/0 group-hover:ring-2 group-hover:ring-indigo-500/20 transition" />
                      </button>
                    </li>
                  );
                })}
              </motion.ul>
            ) : (
              <motion.ul
                key="list"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                ref={listRef}
                className="space-y-2"
              >
                {filtered.map((r) => {
                  const when = new Date(r.lastMessageAt || r.createdAt);
                  const title = r.title || 'Untitled chat';
                  return (
                    <li key={r.id}>
                      <button
                        onClick={() => onOpen(r.id)}
                        className="w-full text-left rounded-xl border px-4 py-3 transition flex items-center justify-between gap-3 bg-background/70 hover:bg-background/90"
                      >
                        <div className="min-w-0 flex items-center gap-3">
                          <div className="grid place-items-center rounded-lg border size-7 shrink-0">
                            <MessageSquare className="size-4 opacity-70" />
                          </div>
                          <div className="min-w-0">
                            <div className="font-medium truncate">{highlight(title, dq)}</div>
                            <div className="text-xs opacity-70 inline-flex items-center gap-1">
                              <History className="size-3.5" />
                              Last activity {when.toLocaleString()}
                            </div>
                          </div>
                        </div>
                        <ArrowRight className="size-4 opacity-70 shrink-0" />
                      </button>
                    </li>
                  );
                })}
              </motion.ul>
            )}
          </AnimatePresence>
        </main>
      </div>
    </TooltipProvider>
  );
}

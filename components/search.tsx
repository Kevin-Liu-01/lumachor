
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
} from 'lucide-react';

import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { fetcher } from '@/lib/utils';

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

  // SWR fetch
  const { data, isLoading } = useSWR<{ results: Result[] }>(
    dq ? `/api/chat-search?q=${encodeURIComponent(dq)}` : null,
    fetcher
  );
  const raw = data?.results ?? [];

  // client filters/sorts
  const filtered = useMemo(() => {
  const src = data?.results ?? []; // ✅ inside memo → stable
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

  return (
    <TooltipProvider delayDuration={0}>
      <div className="relative min-h-dvh">
        {/* Ambient glows */}
        <div className="pointer-events-none absolute -top-24 -left-24 size-80 rounded-full bg-indigo-500/15 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -right-24 size-96 rounded-full bg-fuchsia-500/15 blur-3xl" />

        {/* HERO */}
        <section className="relative border-b bg-background/70 backdrop-blur">
          <div className="mx-auto max-w-7xl px-4 py-8 md:py-12">
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
              <div className="flex items-end justify-between gap-4">
                <div className="min-w-0">
                  <h1 className="text-xl md:text-2xl font-extrabold tracking-tight">
                    Search your Chats
                  </h1>
                  <p className="mt-1 text-sm md:text-base opacity-70">
                    Find any chat by title or message content. Press <kbd className="px-1.5 py-0.5 rounded border">Enter</kbd> to open the top hit.
                  </p>
                </div>
                <div className="hidden md:flex items-center gap-2">
                  <Sparkles className="size-5 opacity-70" />
                  <span className="text-sm opacity-70">
                    {dq ? (isLoading ? 'Searching…' : `${filtered.length} result${filtered.length === 1 ? '' : 's'}`) : 'Type to search'}
                  </span>
                </div>
              </div>

              {/* Jumbo search bar */}
              <div className="mt-6">
                <div className="relative rounded-2xl border bg-background/80 backdrop-blur shadow-sm">
                  <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 size-5 opacity-60" />
                  <Input
                    autoFocus
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="Search by keywords…"
                    className="h-14 md:h-16 pl-12 pr-28 text-base md:text-lg border-0 ring-0 focus-visible:ring-0 focus-visible:outline-none bg-transparent"
                  />
                  {q && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="absolute right-14 top-1/2 -translate-y-1/2 h-8"
                      onClick={() => setQ('')}
                    >
                      <X className="size-4" />
                      <span className="ml-1 hidden sm:inline">Clear</span>
                    </Button>
                  )}
                  <Button
                    className="absolute right-2 top-1/2 -translate-y-1/2 h-10 md:h-12 px-4"
                    onClick={() => filtered[0] && onOpen(filtered[0].id)}
                    disabled={!dq || filtered.length === 0}
                  >
                    <SearchIcon className="mr-2 size-4" />
                    Open top hit
                  </Button>
                </div>

                {/* Quick chips */}
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {chips.map((c) => (
                    <button
                      key={c}
                      onClick={() => setQ(c)}
                      className="rounded-full border px-3 py-1 text-xs hover:bg-foreground/[0.04]"
                    >
                      #{c}
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>

          {/* Sticky controls */}
          <div className="sticky top-0 z-10 border-t bg-background/70 backdrop-blur">
            <div className="mx-auto max-w-7xl px-4 py-2 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant={view === 'grid' ? 'default' : 'outline'}
                      size="sm"
                      className="h-8"
                      onClick={() => setView('grid')}
                    >
                      <LayoutGrid className="mr-2 size-4" /> Grid
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Grid view</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant={view === 'list' ? 'default' : 'outline'}
                      size="sm"
                      className="h-8"
                      onClick={() => setView('list')}
                    >
                      <LayoutList className="mr-2 size-4" /> List
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>List view</TooltipContent>
                </Tooltip>

                <div className="ml-1 hidden md:flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8"
                    onClick={() => setSort(sort === 'recent' ? 'title' : 'recent')}
                  >
                    <ArrowUpDown className="mr-2 size-4" />
                    {sort === 'recent' ? 'Recent' : 'Title'}
                  </Button>

                  <div className="relative">
                    <Button variant="outline" size="sm" className="h-8">
                      <CalendarClock className="mr-2 size-4" />
                      {range === 'all' ? 'All time' : range}
                    </Button>
                    <div className="absolute left-0 mt-1 rounded-xl border bg-background/95 backdrop-blur shadow p-1 hidden group-hover:block" />
                  </div>

                  <div className="flex items-center rounded-xl border bg-background/60 pl-1">
                    {(['24h', '7d', '30d', 'all'] as Range[]).map((r) => (
                      <Button
                        key={r}
                        size="sm"
                        variant={range === r ? 'default' : 'ghost'}
                        className="h-8 px-3"
                        onClick={() => setRange(r)}
                      >
                        {r === '24h' ? '24h' : r}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="text-xs opacity-70">
                {dq ? (isLoading ? 'Searching…' : `${filtered.length} result${filtered.length === 1 ? '' : 's'}`) : 'Idle'}
              </div>
            </div>
          </div>
        </section>

        {/* RESULTS */}
        <main className="mx-auto max-w-7xl p-4 md:p-6">
          <AnimatePresence initial={false} mode="popLayout">
            {!dq ? (
              <motion.div
                key="idle"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                className="rounded-2xl border bg-background/60 backdrop-blur p-6 text-center text-sm opacity-70"
              >
                Start typing to search your chats.
              </motion.div>
            ) : isLoading ? (
              <motion.ul
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className={cx(view === 'grid' ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3' : 'space-y-2')}
              >
                {Array.from({ length: view === 'grid' ? 9 : 6 }).map((_, i) => (
                  <li key={i} className="relative rounded-2xl border p-4 bg-background/60 overflow-hidden">
                    <div className="h-4 w-1/2 bg-foreground/10 rounded mb-2" />
                    <div className="h-3 w-3/4 bg-foreground/10 rounded mb-1.5" />
                    <div className="h-3 w-2/5 bg-foreground/10 rounded" />
                  </li>
                ))}
              </motion.ul>
            ) : filtered.length === 0 ? (
              <motion.div
                key="empty"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                className="rounded-2xl border bg-background/60 backdrop-blur p-10 text-center"
              >
                <div className="mx-auto size-12 rounded-full border grid place-items-center mb-3">
                  <Filter className="size-5 opacity-70" />
                </div>
                <div className="font-medium">No matches</div>
                <div className="text-sm opacity-70 mt-1">Try different keywords or date range.</div>
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
                        className="w-full text-left rounded-2xl border p-4 bg-background/70 hover:bg-background/90 transition group"
                      >
                        <div className="flex items-start gap-3 min-w-0">
                          <div className="grid place-items-center rounded-lg border size-8 shrink-0">
                            <SearchIcon className="size-4 opacity-70" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="font-medium truncate">{highlight(title, dq)}</div>
                            <div className="text-xs opacity-70 mt-0.5">Last activity {when.toLocaleString()}</div>
                          </div>
                          <ArrowRight className="size-4 opacity-0 group-hover:opacity-80 transition shrink-0" />
                        </div>
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
                        className="w-full text-left rounded-xl border px-4 py-3 hover:bg-foreground/[0.04] transition flex items-center justify-between gap-3"
                      >
                        <div className="min-w-0">
                          <div className="font-medium truncate">{highlight(title, dq)}</div>
                          <div className="text-xs opacity-70">Last activity {when.toLocaleString()}</div>
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

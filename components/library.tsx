'use client';

import * as React from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import useSWR from 'swr';
import { useRouter, useSearchParams } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import cx from 'classnames';
import {
  ArrowUpDown,
  BadgeCheck,
  CheckCircle2,
  Copy,
  ExternalLink,
  Hash,
  LayoutGrid,
  LayoutList,
  LibraryBig,
  Link as LinkIcon,
  Plus,
  Search,
  Sparkles,
  Star,
  Tag as TagIcon,
  Trash2,
  UploadCloud,
  X,
} from 'lucide-react';

import { fetcher } from '@/lib/utils';
import { toast } from '@/components/toast';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { TooltipProvider, Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

import type { ContextRow } from '@/components/context-selected-bar';

/* --------------------- types / helpers --------------------- */

type StructuredContext = {
  title: string;
  description: string;
  background_goals: string[];
  tone_style?: string[];
  constraints_scope?: string[];
  example_prompts?: string[];
};
type ContextRowWithMeta = ContextRow & {
  liked?: boolean;
  owner?: boolean;
  publicId?: string | null;
  publishedAt?: string | null;
};
type Scope = 'all' | 'mine' | 'starred' | 'public';
type ViewMode = 'grid' | 'list';
type SortKey = 'createdAt' | 'name' | 'stars';

const unique = <T,>(arr: T[]) => Array.from(new Set(arr));
const cleanTitle = (s: string) => s.replace(/^\s*(?:\*\*Title\*\*|#+)\s*/i, '').trim();
function parseStructured(content: string): StructuredContext | null {
  try {
    const obj = JSON.parse(content);
    if (obj && typeof obj === 'object' && typeof (obj as any).title === 'string') return obj as StructuredContext;
  } catch {}
  return null;
}
function colorFromTag(tag: string) {
  const hues = [262, 280, 200, 150, 20, 330, 210, 100, 40, 0];
  const i = [...tag].reduce((acc, ch) => (acc + ch.charCodeAt(0)) | 0, 0) % hues.length;
  const h = hues[i];
  return `hsl(${h} 85% 45% / 0.25)`;
}
function ShimmerOverlay({ show, rounded = 'rounded-2xl' }: { show: boolean; rounded?: string }) {
  if (!show) return null;
  return (
    <motion.div
      aria-hidden
      className={cx('pointer-events-none absolute inset-0 overflow-hidden', rounded)}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.15 }}
    >
      <motion.div
        className="absolute inset-y-0 w-1/2 bg-gradient-to-r from-transparent via-white/10 to-transparent dark:via-white/5"
        initial={{ left: '-55%' }}
        animate={{ left: ['-55%', '105%'] }}
        transition={{ duration: 1.25, ease: 'linear', repeat: Infinity }}
      />
    </motion.div>
  );
}
function TopStripeLoader({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <span aria-hidden className="pointer-events-none absolute inset-x-0 -top-px h-[2px] overflow-hidden">
      <motion.span
        className="absolute top-0 h-[2px] w-[45%] rounded-full bg-gradient-to-r from-transparent via-fuchsia-500 to-transparent"
        style={{ filter: 'drop-shadow(0 0 6px rgba(217,70,239,.35))' }}
        initial={{ x: '-50%' }}
        animate={{ x: ['-50%', '110%'] }}
        transition={{ duration: 1.1, ease: 'linear', repeat: Infinity }}
      />
    </span>
  );
}

/* --------------------- tiny ui atoms ---------------------- */

function SoftTag({
  label,
  active,
  onClick,
  className,
}: {
  label: string;
  active?: boolean;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        'inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[11px] transition',
        active ? 'border-transparent bg-[--tag-bg] text-foreground' : 'border-foreground/15 hover:bg-foreground/5',
        className,
      )}
      style={active ? ({ ['--tag-bg' as any]: colorFromTag(label) } as React.CSSProperties) : undefined}
    >
      <span className="opacity-80">#</span>
      <span className="font-medium">{label}</span>
    </button>
  );
}

function TagInput({
  value,
  onChange,
  placeholder = 'Add a tag and press Enter',
  disabled = false,
  suggestions = [],
}: {
  value: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
  suggestions?: string[];
}) {
  const [draft, setDraft] = useState('');
  const [openSugs, setOpenSugs] = useState(false);
  const lower = value.map((v) => v.toLowerCase());
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpenSugs(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function commit(token: string) {
    const t = token.trim().toLowerCase();
    if (!t || lower.includes(t)) return;
    onChange([...value, t]);
  }

  const filteredSugs = useMemo(() => {
    if (!draft.trim()) return suggestions.slice(0, 16);
    const d = draft.toLowerCase();
    return suggestions.filter((s) => s.toLowerCase().includes(d) && !lower.includes(s.toLowerCase())).slice(0, 16);
  }, [draft, suggestions, lower]);

  return (
    <div ref={ref} className="w-full relative">
      <div className="rounded-xl border px-2 py-1.5 bg-background/70 backdrop-blur-sm">
        <div className="flex flex-wrap gap-1">
          {value.map((t) => (
            <span
              key={t}
              className="inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[11px]"
              style={{ background: colorFromTag(t), borderColor: 'transparent' }}
            >
              <TagIcon className="size-3 opacity-70" />
              {t}
              <button
                type="button"
                className="ml-0.5 opacity-70 hover:opacity-100"
                onClick={() => onChange(value.filter((x) => x !== t))}
                aria-label={`Remove ${t}`}
                disabled={disabled}
              >
                <X className="size-3" />
              </button>
            </span>
          ))}
          <input
            className="flex-1 min-w-[140px] bg-transparent outline-none text-sm px-1 py-0.5"
            placeholder={placeholder}
            value={draft}
            disabled={disabled}
            onChange={(e) => {
              setDraft(e.target.value);
              setOpenSugs(true);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ',') {
                e.preventDefault();
                commit(draft);
                setDraft('');
                setOpenSugs(false);
              } else if (e.key === 'Backspace' && !draft && value.length) {
                onChange(value.slice(0, -1));
              } else if (e.key === 'Escape') {
                setOpenSugs(false);
              }
            }}
          />
        </div>
      </div>

      <AnimatePresence>
        {openSugs && filteredSugs.length > 0 && (
          <div className="absolute mt-2 z-20">
            <motion.div
              initial={{ opacity: 0, y: -2 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -2 }}
              className="rounded-xl border bg-background/90 backdrop-blur p-2 shadow-sm"
            >
              <div className="text-[11px] mb-1 opacity-70 px-1">Suggestions</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-1.5">
                {filteredSugs.map((s) => (
                  <SoftTag
                    key={s}
                    label={s}
                    onClick={() => {
                      commit(s);
                      setDraft('');
                    }}
                  />
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function TagFilterBox({
  allTags,
  selected,
  onToggle,
  onClear,
  collapsedCount = 14,
}: {
  allTags: string[];
  selected: string[];
  onToggle: (tag: string) => void;
  onClear: () => void;
  collapsedCount?: number;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const filtered = useMemo(() => {
    if (!q.trim()) return allTags;
    const d = q.toLowerCase();
    return allTags.filter((t) => t.toLowerCase().includes(d));
  }, [allTags, q]);

  const visible = useMemo(() => (open ? filtered : filtered.slice(0, collapsedCount)), [filtered, open, collapsedCount]);
  const remaining = Math.max(0, filtered.length - visible.length);

  return (
    <div className="rounded-xl border bg-background/60 backdrop-blur p-2">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-sm opacity-80">Filter by tags</span>
        <Button size="sm" variant="ghost" className="h-7 ml-2" onClick={onClear} disabled={selected.length === 0}>
          Clear
        </Button>
        <div className="ml-auto flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 size-3.5 opacity-60" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search tags…"
              className="pl-7 pr-2 py-1 text-xs rounded border bg-background/70 min-w-[180px]"
              aria-label="Search tags"
            />
          </div>
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-sm"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
          >
            {open ? 'Show less' : 'Show more'}
          </Button>
        </div>
      </div>

      {/* free-flowing, wrapping tags */}
      <div className="mt-2 flex flex-wrap gap-1.5 items-center">
        <SoftTag label="all" active={selected.length === 0} onClick={onClear} />
        {visible.map((t) => (
          <SoftTag key={t} label={t} active={selected.includes(t)} onClick={() => onToggle(t)} />
        ))}
        {!open && remaining > 0 && (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="text-xs opacity-70 px-1"
            aria-label={`Show ${remaining} more tags`}
            title={`Show ${remaining} more`}
          >
            +{remaining} more
          </button>
        )}
      </div>
    </div>
  );
}

/* ------------------------- Library page ------------------------- */

export default function Library() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [scope, setScope] = useState<Scope>((searchParams.get('scope') as Scope) || 'all');
  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [selectedTags, setSelectedTags] = useState<string[]>(
    searchParams.get('tags') ? searchParams.get('tags')!.split(',').filter(Boolean) : [],
  );

  const [view, setView] = useState<ViewMode>((searchParams.get('view') as ViewMode) || 'grid');
  const [sortKey, setSortKey] = useState<SortKey>((searchParams.get('sort') as SortKey) || 'createdAt');
  const [createOpen, setCreateOpen] = useState(false);
  const [createMode, setCreateMode] = useState<'generate' | 'manual'>('generate');

  // generate
  const [genPrompt, setGenPrompt] = useState('');
  const [genTags, setGenTags] = useState<string[]>([]);
  const [genBusy, setGenBusy] = useState(false);
  const genAbortRef = useRef<AbortController | null>(null);

  // manual
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newTags, setNewTags] = useState<string[]>([]);
  const [newContent, setNewContent] = useState('');
  const [creating, setCreating] = useState(false);

  // selection / inspector
  const [activeId, setActiveId] = useState<string | null>(null);

  // data
  const key =
    scope === 'public'
      ? '/api/public-contexts'
      : `/api/contexts?withMeta=1${scope === 'mine' ? '&mine=1' : ''}${scope === 'starred' ? '&starred=1' : ''}`;
  const { data, isLoading, mutate } = useSWR<{ contexts: ContextRowWithMeta[] }>(key, fetcher);
  const contexts = useMemo(() => data?.contexts ?? [], [data?.contexts]);
  const allTagsRaw = useMemo(() => unique(contexts.flatMap((c) => c.tags || [])).sort(), [contexts]);

  // derived results
  const filtered = useMemo(() => {
    let items = contexts;

    if (query) {
      const q = query.toLowerCase();
      items = items.filter((c) => {
        const sc = parseStructured(c.content);
        const hay =
          c.name.toLowerCase() +
          ' ' +
          (c.description || '').toLowerCase() +
          ' ' +
          (sc?.description || '').toLowerCase() +
          ' ' +
          (sc?.background_goals || []).join(' ').toLowerCase();
        return hay.includes(q);
      });
    }
    if (selectedTags.length > 0) {
      items = items.filter((c) => {
        const set = new Set((c.tags || []).map((t) => t.toLowerCase()));
        return selectedTags.some((t) => set.has(t.toLowerCase())); // ANY
      });
    }

    // simple sort
    items = [...items].sort((a, b) => {
      switch (sortKey) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'createdAt':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case 'stars':
          return Number(b.liked) - Number(a.liked);
        default:
          return 0;
      }
    });
    return items;
  }, [contexts, query, selectedTags, sortKey]);

  const active = useMemo(() => (activeId ? filtered.find((c) => c.id === activeId) ?? null : null), [activeId, filtered]);

  // sync URL
  useEffect(() => {
    const sp = new URLSearchParams();
    if (scope !== 'all') sp.set('scope', scope);
    if (query.trim()) sp.set('q', query.trim());
    if (selectedTags.length) sp.set('tags', selectedTags.join(','));
    if (view !== 'grid') sp.set('view', view);
    const qs = sp.toString();
    router.replace(qs ? `/library?${qs}` : '/library');
  }, [router, scope, query, selectedTags, view, sortKey]);

  /* ---------------- actions ---------------- */

  async function handleQuickGenerate() {
    if (!genPrompt.trim()) return;
    setGenBusy(true);
    try {
      const ac = new AbortController();
      genAbortRef.current = ac;
      const res = await fetch('/api/contexts/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userPrompt: genPrompt, tags: genTags, model: 'chat-model' }),
        signal: ac.signal,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.message || 'Failed to generate');
      }
      setGenPrompt('');
      setGenTags([]);
      await mutate();
      toast({ type: 'success', description: 'Context generated!' });
    } catch (e: any) {
      if (e?.name !== 'AbortError') toast({ type: 'error', description: e?.message || 'Failed to generate context' });
    } finally {
      genAbortRef.current = null;
      setGenBusy(false);
    }
  }
  function cancelGenerate() {
    genAbortRef.current?.abort();
    genAbortRef.current = null;
    setGenBusy(false);
    toast({ type: 'success', description: 'Generation canceled.' });
  }

  async function createManualContext() {
    if (!newTitle.trim() || !newContent.trim()) {
      toast({ type: 'error', description: 'Please add a title and content.' });
      return;
    }
    setCreating(true);
    try {
      const res = await fetch('/api/contexts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newTitle, description: newDesc, tags: newTags, content: newContent }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.message || 'Failed to create context');
      }
      setNewTitle(''); setNewDesc(''); setNewTags([]); setNewContent('');
      await mutate();
      toast({ type: 'success', description: 'Context created.' });
    } catch (e: any) {
      toast({ type: 'error', description: e?.message || 'Failed to create context' });
    } finally {
      setCreating(false);
    }
  }

  async function toggleLike(id: string, isLiked: boolean) {
    const prev = contexts;
    const next = prev.map((c) => (c.id === id ? { ...c, liked: !isLiked } : c));
    // optimistic
    (mutate as any)({ contexts: next }, { revalidate: false });
    try {
      const res = await fetch(`/api/contexts/${id}`, { method: 'PATCH' });
      if (!res.ok) throw new Error('Failed to toggle star');
      await mutate();
    } catch {
      (mutate as any)({ contexts: prev }, { revalidate: false });
      toast({ type: 'error', description: 'Could not update star.' });
    }
  }

  async function deleteContext(id: string) {
    const prev = contexts;
    const next = prev.filter((c) => c.id !== id);
    (mutate as any)({ contexts: next }, { revalidate: false });
    try {
      const res = await fetch(`/api/contexts/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');
      await mutate();
      toast({ type: 'success', description: 'Context deleted.' });
      if (activeId === id) setActiveId(null);
    } catch {
      (mutate as any)({ contexts: prev }, { revalidate: false });
      toast({ type: 'error', description: 'Delete failed.' });
    }
  }

  async function publishContext(id: string) {
    try {
      const res = await fetch('/api/public-contexts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contextId: id }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.message || 'Failed to publish');
      }
      await mutate();
      toast({ type: 'success', description: 'Published to Public Library.' });
    } catch (e: any) {
      toast({ type: 'error', description: e?.message || 'Failed to publish' });
    }
  }

  async function unpublishContext(publicId: string) {
    try {
      const res = await fetch(`/api/public-contexts/${publicId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to unpublish');
      await mutate();
      toast({ type: 'success', description: 'Removed from Public Library.' });
    } catch (e: any) {
      toast({ type: 'error', description: e?.message || 'Failed to unpublish' });
    }
  }

  /* ---------------- layout ---------------- */

  return (
        <TooltipProvider delayDuration={0}>

    <div className="relative min-h-dvh">
      {/* ambient glows */}
      <div className="pointer-events-none absolute -top-24 -left-24 size-64 rounded-full bg-indigo-500/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-20 -right-24 size-72 rounded-full bg-fuchsia-500/10 blur-3xl" />

      {/* Hero */}
      <header className="sticky top-0 z-30 border-b bg-background/70 backdrop-blur">
        <div className="mx-auto max-w-7xl px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="grid place-items-center rounded-xl border bg-background/80 p-2 text-indigo-600 border-indigo-500/30">
              <LibraryBig className="size-5" />
            </div>
            <div className="min-w-0">
              <div className="font-semibold leading-tight">Context Library</div>
              <div className="text-xs opacity-70">
                {isLoading ? 'Loading…' : `${filtered.length} of ${(data?.contexts ?? []).length} contexts`}
              </div>
            </div>
          </div>

          {/* scope + view + sort */}
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-1 rounded-xl border p-1 bg-background/60">
              {(['all', 'mine', 'starred', 'public'] as Scope[]).map((s) => (
                <Button
                  key={s}
                  size="sm"
                  variant={scope === s ? 'default' : 'ghost'}
                  className="h-8 px-3"
                  onClick={() => setScope(s)}
                >
                  {s[0].toUpperCase() + s.slice(1)}
                </Button>
              ))}
            </div>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={view === 'grid' ? 'default' : 'outline'}
                  size="icon"
                  className="size-8"
                  onClick={() => setView('grid')}
                >
                  <LayoutGrid className="size-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Grid view</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={view === 'list' ? 'default' : 'outline'}
                  size="icon"
                  className="size-8"
                  onClick={() => setView('list')}
                >
                  <LayoutList className="size-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>List view</TooltipContent>
            </Tooltip>

            <div className="relative">
              <Button variant="outline" size="sm" className="h-8">
                <ArrowUpDown className="mr-2 size-4" />
                { sortKey === 'createdAt' ? 'Created' : sortKey === 'name' ? 'Name' : 'Stars'}
              </Button>
              {/* simple popoverless toggle cycle on click for brevity */}
              <button
                className="absolute inset-0"
                aria-label="Change sort"
                onClick={() => {
                  const order: SortKey[] = [ 'createdAt', 'name', 'stars'];
                  const i = order.indexOf(sortKey);
                  setSortKey(order[(i + 1) % order.length]);
                }}
              />
            </div>

            <Button
              size="sm"
              onClick={() => setCreateOpen((v) => !v)}
              className="h-8"
              variant={createOpen ? 'default' : 'outline'}
            >
              <Plus className="mr-2 size-4" /> New
            </Button>
          </div>
        </div>

        {/* Search row */}
        <div className="mx-auto max-w-7xl px-4 pb-3">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 size-4 opacity-60" />
              <Input
                className="pl-8"
                placeholder="Search by title, description, or goals"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <div className="text-xs opacity-70 hidden md:block">Tip: ↑/↓ + Enter to open inspector</div>
          </div>
          {/* scope for mobile */}
          <div className="mt-2 sm:hidden inline-flex items-center gap-1 rounded-xl border p-1 bg-background/60">
            {(['all', 'mine', 'starred', 'public'] as Scope[]).map((s) => (
              <Button key={s} size="sm" variant={scope === s ? 'default' : 'ghost'} className="h-8 px-3" onClick={() => setScope(s)}>
                {s[0].toUpperCase() + s.slice(1)}
              </Button>
            ))}
          </div>
        </div>
      </header>

      {/* Create / Generate (collapsible) */}
      <section className="mx-auto max-w-7xl px-4 pt-4">
        <AnimatePresence initial={false}>
          {createOpen && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="rounded-2xl border overflow-hidden bg-background/60 backdrop-blur"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 border-b">
                <div className="inline-flex relative p-1 rounded-xl border bg-background/60">
                  <motion.div
                    className="absolute inset-y-1 rounded-lg bg-indigo-500/10 border border-indigo-500/20"
                    animate={{ left: createMode === 'generate' ? 4 : 'calc(50% + 4px)', width: 'calc(50% - 8px)' }}
                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                  />
                  <button
                    className={cx('relative z-10 h-8 px-3 text-sm rounded-lg', createMode === 'generate' ? 'text-indigo-600' : 'opacity-80')}
                    onClick={() => setCreateMode('generate')}
                  >
                    <span className="inline-flex items-center gap-1">
                      <Sparkles className="size-4" /> Generate
                    </span>
                  </button>
                  <button
                    className={cx('relative z-10 h-8 px-3 text-sm rounded-lg', createMode === 'manual' ? 'text-indigo-600' : 'opacity-80')}
                    onClick={() => setCreateMode('manual')}
                  >
                    <span className="inline-flex items-center gap-1">
                      <Plus className="size-4" /> Manual
                    </span>
                  </button>
                </div>

                <Button size="sm" variant="ghost" onClick={() => setCreateOpen(false)}>
                  Close
                </Button>
              </div>

              {/* panels */}
              {createMode === 'generate' ? (
                <div className="relative p-3">
                  <TopStripeLoader show={genBusy} />
                  <ShimmerOverlay show={genBusy} />
                  <div className="text-sm font-medium mb-2">Generate</div>
                  <Input
                    placeholder="What should this assistant specialize in?"
                    value={genPrompt}
                    onChange={(e) => setGenPrompt(e.target.value)}
                    disabled={genBusy}
                  />
                  <div className="mt-2">
                    <div className="flex items-center gap-2 text-xs opacity-70 mb-1">
                      <TagIcon className="size-3" /> Tags
                    </div>
                    <TagInput value={genTags} onChange={setGenTags} suggestions={allTagsRaw} disabled={genBusy} />
                  </div>
                  <div className="mt-3 flex justify-end gap-2">
                    {genBusy && (
                      <Button variant="outline" onClick={cancelGenerate}>
                        Cancel
                      </Button>
                    )}
                    <Button onClick={handleQuickGenerate} disabled={genBusy || !genPrompt.trim()}>
                      {genBusy ? 'Generating…' : 'Generate'}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="relative p-3">
                  <TopStripeLoader show={creating} />
                  <ShimmerOverlay show={creating} />
                  <div className="text-sm font-medium mb-2">Create manually</div>
                  <Input placeholder="Title" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} disabled={creating} />
                  <Input
                    className="mt-2"
                    placeholder="Short description (optional)"
                    value={newDesc}
                    onChange={(e) => setNewDesc(e.target.value)}
                    disabled={creating}
                  />
                  <div className="mt-2">
                    <div className="flex items-center gap-2 text-xs opacity-70 mb-1">
                      <TagIcon className="size-3" /> Tags
                    </div>
                    <TagInput value={newTags} onChange={setNewTags} suggestions={allTagsRaw} disabled={creating} />
                  </div>
                  <div className="mt-2">
                    <div className="text-xs opacity-70 mb-1">Content (JSON or plain text)</div>
                    <Textarea
                      rows={6}
                      placeholder="Paste structured JSON or free text."
                      value={newContent}
                      onChange={(e) => setNewContent(e.target.value)}
                      disabled={creating}
                    />
                  </div>
                  <div className="mt-3 flex justify-end">
                    <Button onClick={createManualContext} disabled={creating || !newTitle.trim() || !newContent.trim()}>
                      {creating ? 'Creating…' : 'Create Context'}
                    </Button>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      {/* Main grid: filters • results • inspector */}
      <main className="mx-auto max-w-7xl p-4">
        <div className="grid grid-cols-1 lg:grid-cols-[260px,minmax(0,1fr),360px] gap-4">
          {/* left rail: tags */}
          <div className="space-y-3">
            <TagFilterBox
              allTags={allTagsRaw}
              selected={selectedTags}
              onToggle={(t) => setSelectedTags((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]))}
              onClear={() => setSelectedTags([])}
              collapsedCount={18}
            />
            {/* quick tips */}
            <div className="rounded-xl border p-3 text-xs opacity-80">
              <div className="font-medium text-sm mb-1">Tips</div>
              <ul className="list-disc pl-4 space-y-1">
                <li>Star favorites to pin them.</li>
                <li>Use Generate for fast boilerplates; Manual for full control.</li>
                <li>Public contexts are visible to everyone.</li>
              </ul>
            </div>
          </div>

          {/* results */}
          <section className="min-w-0">
            {isLoading ? (
              <ul className={cx(view === 'grid' ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3' : 'space-y-2')}>
                {Array.from({ length: 9 }).map((_, i) => (
                  <li key={i} className="relative rounded-2xl border p-3 bg-background/60 overflow-hidden">
                    <ShimmerOverlay show />
                    <div className="h-4 w-48 bg-foreground/10 rounded mb-2" />
                    <div className="h-3 w-80 bg-foreground/10 rounded mb-1.5" />
                    <div className="h-3 w-64 bg-foreground/10 rounded" />
                  </li>
                ))}
              </ul>
            ) : filtered.length === 0 ? (
              <div className="p-6 text-sm opacity-70 border rounded-xl text-center">
                No contexts found. Try adjusting search or tags.
              </div>
            ) : view === 'grid' ? (
              <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {filtered.map((c) => {
                  const structured = parseStructured(c.content);
                  const title = cleanTitle(structured?.title || c.name);
                  const isActive = activeId === c.id;
                  const isPublished = !!c.publicId;
                  return (
                    <li key={c.id}>
                      <div
                        className={cx(
                          'group relative rounded-2xl border p-3 bg-background/70 hover:bg-background/90 transition',
                          isActive && 'ring-2 ring-indigo-500/40',
                        )}
                        onClick={() => setActiveId(c.id)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => e.key === 'Enter' && setActiveId(c.id)}
                      >
                        <div className="flex items-start gap-2 min-w-0">
                          <div className="grid place-items-center rounded-lg border size-7 shrink-0 text-foreground/70">
                            <LibraryBig className="size-4" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 min-w-0">
                              <div className="font-medium truncate">{title}</div>
                              {c.owner && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
                                  You
                                </span>
                              )}
                              {isPublished && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-medium text-amber-700">
                                  Public
                                </span>
                              )}
                            </div>
                            <div className="text-xs opacity-70 line-clamp-2 mt-0.5">
                              {structured?.description || c.description || '—'}
                            </div>
                            {c.tags?.length > 0 && (
                              <div className="mt-1.5 flex flex-wrap gap-1.5">
                                {c.tags.slice(0, 6).map((t) => (
                                  <span
                                    key={t}
                                    className="inline-flex items-center rounded-full border px-2 py-0.5 text-[10px]"
                                    style={{ background: colorFromTag(t), borderColor: 'transparent' }}
                                  >
                                    #{t}
                                  </span>
                                ))}
                                {c.tags.length > 6 && (
                                  <Badge variant="outline" className="text-[10px] opacity-70">
                                    +{c.tags.length - 6}
                                  </Badge>
                                )}
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="absolute right-2 top-2 flex items-center gap-1">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                size="icon"
                                variant="ghost"
                                className={cx('size-7', c.liked ? 'text-yellow-500' : 'text-foreground/60')}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleLike(c.id, !!c.liked);
                                }}
                                aria-label={c.liked ? 'Unstar' : 'Star'}
                              >
                                {c.liked ? <Star className="size-4 fill-yellow-500" /> : <Star className="size-4" />}
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>{c.liked ? 'Unstar' : 'Star'}</TooltipContent>
                          </Tooltip>

                          {c.owner && (
                            <>
                              {c.publicId ? (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    unpublishContext(c.publicId!);
                                  }}
                                >
                                  Unpublish
                                </Button>
                              ) : (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    publishContext(c.id);
                                  }}
                                >
                                  Publish
                                </Button>
                              )}
                              <Button
                                size="icon"
                                variant="ghost"
                                className="size-7 text-rose-500"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteContext(c.id);
                                }}
                                aria-label="Delete"
                              >
                                <Trash2 className="size-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <ul className="space-y-2">
                {filtered.map((c) => {
                  const structured = parseStructured(c.content);
                  const title = cleanTitle(structured?.title || c.name);
                  const isActive = activeId === c.id;
                  const isPublished = !!c.publicId;
                  return (
                    <li key={c.id}>
                      <div
                        className={cx(
                          'group relative rounded-2xl border px-3 py-2.5 bg-background/70 hover:bg-background/90 transition',
                          isActive && 'ring-2 ring-indigo-500/40',
                        )}
                        onClick={() => setActiveId(c.id)}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="grid place-items-center rounded-lg border size-7 shrink-0 text-foreground/70">
                            <LibraryBig className="size-4" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 min-w-0">
                              <div className="font-medium truncate">{title}</div>
                              {c.owner && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
                                  You
                                </span>
                              )}
                              {isPublished && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-medium text-amber-700">
                                  Public
                                </span>
                              )}
                            </div>
                            <div className="text-xs opacity-70 line-clamp-1">{structured?.description || c.description || '—'}</div>
                          </div>

                          <div className="flex items-center gap-1 ml-2">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className={cx('size-7', c.liked ? 'text-yellow-500' : 'text-foreground/60')}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleLike(c.id, !!c.liked);
                                  }}
                                  aria-label={c.liked ? 'Unstar' : 'Star'}
                                >
                                  {c.liked ? <Star className="size-4 fill-yellow-500" /> : <Star className="size-4" />}
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>{c.liked ? 'Unstar' : 'Star'}</TooltipContent>
                            </Tooltip>

                            {c.owner && (
                              <>
                                {c.publicId ? (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-7"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      unpublishContext(c.publicId!);
                                    }}
                                  >
                                    Unpublish
                                  </Button>
                                ) : (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-7"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      publishContext(c.id);
                                    }}
                                  >
                                    Publish
                                  </Button>
                                )}
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="size-7 text-rose-500"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    deleteContext(c.id);
                                  }}
                                  aria-label="Delete"
                                >
                                  <Trash2 className="size-4" />
                                </Button>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          {/* inspector (right) */}
          <aside className="hidden lg:block">
            <div className="sticky top-[72px] rounded-2xl border bg-background/70 backdrop-blur p-3 min-h-[280px]">
              {!active ? (
                <div className="text-sm opacity-70">Select a context to preview details.</div>
              ) : (
                <>
                  <div className="flex items-start gap-2">
                    <div className="grid place-items-center rounded-lg border size-10 shrink-0 text-foreground/70">
                      <LibraryBig className="size-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold truncate">{cleanTitle(parseStructured(active.content)?.title || active.name)}</div>
                      <div className="text-xs opacity-70">
                        {active.owner ? 'Owned by you' : 'Shared'}
                        {active.publicId ? ' • Public' : ''}
                      </div>
                    </div>
                    <Button size="icon" variant="ghost" onClick={() => setActiveId(null)}>
                      <X className="size-4" />
                    </Button>
                  </div>

                  <div className="mt-2 text-sm opacity-80">
                    {parseStructured(active.content)?.description || active.description || '—'}
                  </div>

                  {active.tags?.length ? (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {active.tags.map((t) => (
                        <span
                          key={t}
                          className="inline-flex items-center rounded-full border px-2 py-0.5 text-[10px]"
                          style={{ background: colorFromTag(t), borderColor: 'transparent' }}
                        >
                          #{t}
                        </span>
                      ))}
                    </div>
                  ) : null}

                  {/* structured bits */}
                  {(() => {
                    const sc = parseStructured(active.content);
                    if (!sc) return null;
                    return (
                      <div className="mt-3 grid gap-2">
                        {sc.background_goals?.length ? (
                          <div>
                            <div className="text-[11px] font-medium opacity-70 mb-1">Goals</div>
                            <ul className="text-[12px] space-y-1 list-disc pl-4">
                              {sc.background_goals.map((g, i) => (
                                <li key={i}>{g}</li>
                              ))}
                            </ul>
                          </div>
                        ) : null}
                        {sc.example_prompts?.length ? (
                          <div>
                            <div className="text-[11px] font-medium opacity-70 mb-1">Examples</div>
                            <ul className="text-[12px] space-y-1 list-disc pl-4">
                              {sc.example_prompts.map((g, i) => (
                                <li key={i} className="break-words">{g}</li>
                              ))}
                            </ul>
                          </div>
                        ) : null}
                      </div>
                    );
                  })()}

                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        navigator.clipboard.writeText(active.content).then(
                          () => toast({ type: 'success', description: 'Copied JSON/text content.' }),
                          () => toast({ type: 'error', description: 'Copy failed.' }),
                        );
                      }}
                    >
                      <Copy className="mr-2 size-4" /> Copy content
                    </Button>
                    {active.publicId ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          const url = `${location.origin}/public/${active.publicId}`;
                          navigator.clipboard.writeText(url);
                          toast({ type: 'success', description: 'Public link copied.' });
                        }}
                      >
                        <LinkIcon className="mr-2 size-4" /> Copy public link
                      </Button>
                    ) : null}
                    <Button
                      size="sm"
                      onClick={() => {
                        // optional: deep-link to chat creator with context
                        router.push(`/?context=${active.id}`);
                        toast({ type: 'success', description: 'Sending you to a new chat...' });
                      }}
                    >
                      <ExternalLink className="mr-2 size-4" /> Use in chat
                    </Button>
                    <Button
                      size="sm"
                      variant={active.liked ? 'default' : 'outline'}
                      onClick={() => toggleLike(active.id, !!active.liked)}
                    >
                      <Star className={cx('mr-2 size-4', active.liked && 'fill-yellow-500 text-yellow-500')} />
                      {active.liked ? 'Starred' : 'Star'}
                    </Button>
                    {active.owner && (
                      <>
                        {active.publicId ? (
                          <Button size="sm" variant="outline" onClick={() => unpublishContext(active.publicId!)}>
                            <UploadCloud className="mr-2 size-4" /> Unpublish
                          </Button>
                        ) : (
                          <Button size="sm" variant="outline" onClick={() => publishContext(active.id)}>
                            <UploadCloud className="mr-2 size-4" /> Publish
                          </Button>
                        )}
                        <Button size="sm" variant="destructive" onClick={() => deleteContext(active.id)}>
                          <Trash2 className="mr-2 size-4" /> Delete
                        </Button>
                      </>
                    )}
                  </div>
                </>
              )}
            </div>
          </aside>
        </div>
      </main>
    </div></TooltipProvider>
  );
}

'use client';

import * as React from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import useSWR from 'swr';
import cx from 'classnames';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowUpDown,
  ChevronDown,
  Copy,
  Download,
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
import { Skeleton } from '@/components/ui/skeleton';
import { ShimmerOverlay, TopStripeLoader } from '@/components/ui/shimmer';

import type { ContextRow } from '@/components/context-selected-bar';
import LumachorMark from './lumachormark';

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

const CHAT_PATH = '/'; // change to '/chat' if your chat lives there

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

/* ---------------- tiny ui atoms ---------------- */

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
  loading = false,
}: {
  value: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
  suggestions?: string[];
  loading?: boolean;
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

  if (loading) {
    return (
      <div className="rounded-xl border px-2 py-1.5 bg-background/70 backdrop-blur-sm">
        <div className="flex flex-wrap gap-1">
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-6 w-16" />
          <Skeleton className="h-6 w-20" />
        </div>
      </div>
    );
  }

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
                  <SoftTag key={s} label={s} onClick={() => { commit(s); setDraft(''); }} />
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
  loading = false,
}: {
  allTags: string[];
  selected: string[];
  onToggle: (tag: string) => void;
  onClear: () => void;
  collapsedCount?: number;
  loading?: boolean;
}) {
  const [open, setOpen] = React.useState(false);
  const [q, setQ] = React.useState('');

  const filtered = React.useMemo(() => {
    if (!q.trim()) return allTags;
    const d = q.toLowerCase();
    return allTags.filter((t) => t.toLowerCase().includes(d));
  }, [allTags, q]);

  const visible = React.useMemo(
    () => (open ? filtered : filtered.slice(0, collapsedCount)),
    [filtered, open, collapsedCount],
  );
  const remaining = Math.max(0, filtered.length - visible.length);

  return (
    <div className="rounded-2xl border bg-background/60 backdrop-blur p-3">
      {/* Header row */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="grid place-items-center rounded-lg border size-6 shrink-0 text-indigo-600 border-indigo-500/30 bg-background/70">
            <TagIcon className="size-3.5" />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-semibold leading-tight">Filter by tags</div>
            <div className="text-[11px] opacity-70">{selected.length}/{allTags.length} selected</div>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <Button
            size="sm"
            variant="ghost"
            className="h-7"
            onClick={onClear}
            disabled={selected.length === 0 || loading}
          >
            Clear
          </Button>
          <Button
            size="icon"
            variant="outline"
            className="size-7"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            title={open ? 'Show fewer tags' : 'Show more tags'}
            disabled={loading}
          >
            <ChevronDown className={cx('size-4 transition-transform', open && 'rotate-180')} />
          </Button>
        </div>
      </div>

      {/* Search row */}
      <div className="mt-2">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 size-4 opacity-60" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search tags…"
            className="pl-8 h-9 w-full"
            aria-label="Search tags"
            loading={loading}
            shimmer={loading}
          />
        </div>
      </div>

      {/* Tag chips */}
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        {loading ? (
          <>
            <Skeleton className="h-6 w-12 rounded-full" />
            <Skeleton className="h-6 w-16 rounded-full" />
            <Skeleton className="h-6 w-10 rounded-full" />
            <Skeleton className="h-6 w-20 rounded-full" />
          </>
        ) : (
          <>
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
          </>
        )}
      </div>
    </div>
  );
}

/* ------------------------- Library page ------------------------- */

export default function Library() {
  const searchParams = useSearchParams();
  const router = useRouter();

  // default scope
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

  // per-id pending states
  const [pending, setPending] = useState<{
    like: Set<string>;
    del: Set<string>;
    pub: Set<string>;
    unpub: Set<string>;
    imp: Set<string>;
  }>({
    like: new Set(),
    del: new Set(),
    pub: new Set(),
    unpub: new Set(),
    imp: new Set(),
  });

  /* ---------------- data ---------------- */

  const { data: mineData, isLoading: loadingMine, mutate: mutateMine } = useSWR<{ contexts: ContextRowWithMeta[] }>(
    '/api/contexts?withMeta=1&mine=1',
    fetcher
  );
  const { data: starredData, isLoading: loadingStarred, mutate: mutateStarred } = useSWR<{ contexts: ContextRowWithMeta[] }>(
    '/api/contexts?withMeta=1&starred=1',
    fetcher
  );
  const { data: publicData, isLoading: loadingPublic, mutate: mutatePublic } = useSWR<{ contexts: ContextRowWithMeta[] }>(
    '/api/public-contexts',
    fetcher
  );

  const mine = useMemo(() => mineData?.contexts ?? [], [mineData?.contexts]);
  const starred = useMemo(() => starredData?.contexts ?? [], [starredData?.contexts]);
  const pub = useMemo(() => publicData?.contexts ?? [], [publicData?.contexts]);

  /* ------------ NORMALIZE SOURCES INTO ONE CANONICAL INDEX ------------ */

  const mineMap = useMemo(() => {
    const m = new Map<string, ContextRowWithMeta>();
    for (const row of mine) m.set(row.id, { ...row, owner: true });
    return m;
  }, [mine]);

  const pubMap = useMemo(() => {
    const m = new Map<string, ContextRowWithMeta>();
    for (const row of pub) m.set(row.id, row);
    return m;
  }, [pub]);

  const starredSet = useMemo(() => new Set(starred.map((s) => s.id)), [starred]);

  const universe: ContextRowWithMeta[] = useMemo(() => {
    const ids = unique([...Array.from(mineMap.keys()), ...Array.from(pubMap.keys()), ...starred.map((s) => s.id)]);
    return ids.map((id) => {
      const mineRow = mineMap.get(id);
      const pubRow = pubMap.get(id);
      const base = (mineRow ?? pubRow)!; // exists in at least one index
      return {
        ...base,
        owner: !!mineRow,
        liked: Boolean(base.liked || starredSet.has(id)),
        publicId: pubRow?.publicId ?? base.publicId ?? null,
        publishedAt: pubRow?.publishedAt ?? base.publishedAt ?? null,
      };
    });
  }, [mineMap, pubMap, starred, starredSet]);

  const itemsByScope = useMemo(
    () => ({
      all: universe,
      mine: universe.filter((c) => c.owner),
      public: universe.filter((c) => !!c.publicId),
      starred: universe.filter((c) => !!c.liked),
    }),
    [universe],
  );

  const scopeItems = itemsByScope[scope];

  // Tags from current scope
  const allTagsRaw = useMemo(() => unique(scopeItems.flatMap((c) => c.tags || [])).sort(), [scopeItems]);

  // Loading: ensure public meta is present where needed for pills
  const isLoading =
    scope === 'public'
      ? loadingPublic
      : scope === 'mine'
      ? loadingMine || loadingPublic
      : scope === 'starred'
      ? loadingStarred || loadingPublic
      : loadingMine || loadingStarred || loadingPublic;

  /* ---------------- filters / sort / active ---------------- */

  const filtered = useMemo(() => {
    let items = scopeItems;
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
        return selectedTags.some((t) => set.has(t.toLowerCase()));
      });
    }
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
  }, [scopeItems, query, selectedTags, sortKey]);

  const active = useMemo(() => (activeId ? filtered.find((c) => c.id === activeId) ?? null : null), [activeId, filtered]);

  // sync url (omit default pieces)
  useEffect(() => {
    const sp = new URLSearchParams();
    if (scope !== 'all') sp.set('scope', scope);
    if (query.trim()) sp.set('q', query.trim());
    if (selectedTags.length) sp.set('tags', selectedTags.join(','));
    if (view !== 'grid') sp.set('view', view);
    if (sortKey !== 'createdAt') sp.set('sort', sortKey);
    router.replace(sp.toString() ? `/library?${sp.toString()}` : '/library');
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
      await Promise.all([mutateMine(), mutateStarred(), mutatePublic()]);
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
      setNewTitle('');
      setNewDesc('');
      setNewTags([]);
      setNewContent('');
      await Promise.all([mutateMine(), mutateStarred(), mutatePublic()]);
      toast({ type: 'success', description: 'Context created.' });
    } catch (e: any) {
      toast({ type: 'error', description: e?.message || 'Failed to create context' });
    } finally {
      setCreating(false);
    }
  }

  async function toggleLike(id: string, isLiked: boolean) {
    setPending((p) => ({ ...p, like: new Set(p.like).add(id) }));
    try {
      const res = await fetch(`/api/contexts/${id}`, { method: 'PATCH' });
      if (!res.ok) throw new Error('Failed to toggle star');
      await Promise.all([mutateMine(), mutateStarred(), mutatePublic()]);
    } catch {
      toast({ type: 'error', description: 'Could not update star.' });
    } finally {
      setPending((p) => {
        const n = new Set(p.like);
        n.delete(id);
        return { ...p, like: n };
      });
    }
  }

  async function deleteContext(id: string) {
    setPending((p) => ({ ...p, del: new Set(p.del).add(id) }));
    try {
      const res = await fetch(`/api/contexts/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');
      await Promise.all([mutateMine(), mutateStarred(), mutatePublic()]);
      toast({ type: 'success', description: 'Context deleted.' });
      if (activeId === id) setActiveId(null);
    } catch {
      toast({ type: 'error', description: 'Delete failed.' });
    } finally {
      setPending((p) => {
        const n = new Set(p.del);
        n.delete(id);
        return { ...p, del: n };
      });
    }
  }

  async function publishContext(id: string) {
    setPending((p) => ({ ...p, pub: new Set(p.pub).add(id) }));
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
      await Promise.all([mutateMine(), mutateStarred(), mutatePublic()]);
      toast({ type: 'success', description: 'Published to Public Library.' });
    } catch (e: any) {
      toast({ type: 'error', description: e?.message || 'Failed to publish' });
    } finally {
      setPending((p) => {
        const n = new Set(p.pub);
        n.delete(id);
        return { ...p, pub: n };
      });
    }
  }

  async function unpublishContext(publicId: string) {
    setPending((p) => ({ ...p, unpub: new Set(p.unpub).add(publicId) }));
    try {
      const res = await fetch(`/api/public-contexts/${publicId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to unpublish');
      await Promise.all([mutateMine(), mutateStarred(), mutatePublic()]);
      toast({ type: 'success', description: 'Removed from Public Library.' });
    } catch (e: any) {
      toast({ type: 'error', description: e?.message || 'Failed to unpublish' });
    } finally {
      setPending((p) => {
        const n = new Set(p.unpub);
        n.delete(publicId);
        return { ...p, unpub: n };
      });
    }
  }

  const importPublicContext = React.useCallback(
    async (publicId: string) => {
      setPending((p) => ({ ...p, imp: new Set(p.imp).add(publicId) }));
      try {
        const res = await fetch('/api/contexts/import', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ publicId }),
        });
        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          throw new Error(j?.message || 'Failed to import');
        }
        const { context } = await res.json();
        await Promise.all([mutateMine(), mutateStarred(), mutatePublic()]);
        return context as ContextRowWithMeta;
      } finally {
        setPending((p) => {
          const n = new Set(p.imp);
          n.delete(publicId);
          return { ...p, imp: n };
        });
      }
    },
    [mutateMine, mutateStarred, mutatePublic],
  );

  const openInChat = React.useCallback(
    async (context: ContextRowWithMeta) => {
      try {
        let ctx = context;
        if (!ctx.owner) {
          if (!ctx.publicId) {
            toast({ type: 'error', description: 'Cannot use: missing public id.' });
            return;
          }
          ctx = await importPublicContext(ctx.publicId);
          toast({ type: 'success', description: 'Added to your library.' });
        }
        router.push(`${CHAT_PATH}?context=${encodeURIComponent(ctx.id)}`);
      } catch (e: any) {
        toast({ type: 'error', description: e?.message || 'Could not use this context.' });
      }
    },
    [importPublicContext, router],
  );

  /* ---------------- layout (100vh with internal scroll) ---------------- */

  return (
    <TooltipProvider delayDuration={0}>
      <div className="h-screen overflow-hidden flex flex-col relative">
        {/* ambient glows */}
        <div className="pointer-events-none absolute -top-24 -left-24 size-64 rounded-full bg-indigo-500/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -right-24 size-72 rounded-full bg-fuchsia-500/10 blur-3xl" />

        {/* Header */}
        <header className="border-b bg-background/70 backdrop-blur">
          <div className="mx-auto max-w-7xl px-4 py-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="grid place-items-center rounded-xl border bg-background/80 p-2 text-indigo-600 border-indigo-500/30">
                <LibraryBig className="size-5" />
              </div>
              <div className="min-w-0">
                <div className="font-semibold leading-tight">Context Library</div>
                <div className="text-xs opacity-70 h-4">
                  {isLoading ? <Skeleton className="h-4 w-40" /> : `${filtered.length} of ${scopeItems.length} contexts`}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="hidden sm:flex items-center gap-1 rounded-xl border p-1 bg-background/60">
                {(['all', 'mine', 'public', 'starred'] as Scope[]).map((s) => (
                  <Button
                    key={s}
                    size="sm"
                    variant={scope === s ? 'default' : 'ghost'}
                    className="h-8 px-3"
                    onClick={() => setScope(s)}
                    shimmer={isLoading && scope === s}
                  >
                    {s[0].toUpperCase() + s.slice(1)}
                  </Button>
                ))}
              </div>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant={view === 'grid' ? 'default' : 'outline'} size="icon" className="size-8" onClick={() => setView('grid')}>
                    <LayoutGrid className="size-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Grid view</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant={view === 'list' ? 'default' : 'outline'} size="icon" className="size-8" onClick={() => setView('list')}>
                    <LayoutList className="size-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>List view</TooltipContent>
              </Tooltip>

              <div className="relative">
                <Button variant="outline" size="sm" className="h-8">
                  <ArrowUpDown className="mr-2 size-4" />
                  {sortKey === 'createdAt' ? 'Created' : sortKey === 'name' ? 'Name' : 'Stars'}
                </Button>
                <button
                  className="absolute inset-0"
                  aria-label="Change sort"
                  onClick={() => {
                    const order: SortKey[] = ['createdAt', 'name', 'stars'];
                    const i = order.indexOf(sortKey);
                    setSortKey(order[(i + 1) % order.length]);
                  }}
                />
              </div>

              <Button size="sm" onClick={() => setCreateOpen((v) => !v)} className="h-8" variant={createOpen ? 'default' : 'outline'}>
                <Plus className="mr-2 size-4" /> New
              </Button>
            </div>
          </div>

          {/* Search row */}
          <div className="mx-auto max-w-7xl px-4 pb-3">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute z-20 left-2 top-1/2 -translate-y-1/2 size-4 opacity-60" />
                <Input
                  className="pl-8"
                  placeholder="Search by title, description, or goals"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  shimmer={isLoading}
                />
              </div>
              <div className="text-xs opacity-70 hidden md:block">Tip: ↑/↓ + Enter to open inspector</div>
            </div>
            {/* scope for mobile */}
            <div className="mt-2 sm:hidden inline-flex items-center gap-1 rounded-xl border p-1 bg-background/60">
              {(['all', 'mine', 'public', 'starred'] as Scope[]).map((s) => (
                <Button key={s} size="sm" variant={scope === s ? 'default' : 'ghost'} className="h-8 px-3" onClick={() => setScope(s)}>
                  {s[0].toUpperCase() + s.slice(1)}
                </Button>
              ))}
            </div>
          </div>
        </header>

        {/* Scrollable content area */}
        <div className="flex-1 overflow-y-auto">
          {/* Create / Generate (collapsible) */}
          <section className="mx-auto max-w-7xl px-4 pt-4">
            <AnimatePresence initial={false}>
              {createOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  className="relative rounded-2xl border overflow-hidden bg-background/60 backdrop-blur"
                >
                  <TopStripeLoader show={genBusy || creating} />
                  <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 border-b">
                    <div className="inline-flex relative p-1 rounded-xl border bg-background/60">
                      <motion.div
                        className="absolute inset-y-1 rounded-lg bg-indigo-500/10 border border-indigo-500/20"
                        animate={{ left: createMode === 'generate' ? 4 : 'calc(50% + 4px)', width: 'calc(50% - 8px)' }}
                        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                      />
                      <button
                        className={cx(
                          'relative flex items-center gap-1 z-10 h-8 pr-4 pl-2 text-sm rounded-lg',
                          createMode === 'generate' ? 'text-indigo-600' : 'opacity-80',
                        )}
                        onClick={() => setCreateMode('generate')}
                      >
                        <Sparkles className="size-4" /> Generate
                      </button>
                      <button
                        className={cx(
                          'relative flex items-center gap-1 z-10 h-8 pr-4 pl-2 text-sm rounded-lg',
                          createMode === 'manual' ? 'text-indigo-600' : 'opacity-80',
                        )}
                        onClick={() => setCreateMode('manual')}
                      >
                        <Plus className="size-4" /> Manual
                      </button>
                    </div>

                    <Button size="sm" variant="ghost" onClick={() => setCreateOpen(false)}>
                      Close
                    </Button>
                  </div>

                  {createMode === 'generate' ? (
                    <div className="relative p-3">
                      <ShimmerOverlay show={genBusy} />
                      <div className="text-sm font-medium mb-2">Generate</div>
                      <Input
                        placeholder="What should this assistant specialize in?"
                        value={genPrompt}
                        onChange={(e) => setGenPrompt(e.target.value)}
                        loading={genBusy}
                        shimmer={genBusy}
                      />
                      <div className="mt-2">
                        <div className="flex items-center gap-2 text-xs opacity-70 mb-1">
                          <TagIcon className="size-3" /> Tags
                        </div>
                        <TagInput value={genTags} onChange={setGenTags} suggestions={allTagsRaw} loading={genBusy} />
                      </div>
                      <div className="mt-3 flex justify-end gap-2">
                        <Button variant="outline" onClick={cancelGenerate} disabled={!genBusy}>
                          Cancel
                        </Button>
                        <Button onClick={handleQuickGenerate} loading={genBusy} loadingText="Generating…">
                          Generate
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="relative p-3">
                      <ShimmerOverlay show={creating} />
                      <div className="text-sm font-medium mb-2">Create manually</div>
                      <Input placeholder="Title" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} loading={creating} shimmer={creating} />
                      <Input
                        className="mt-2"
                        placeholder="Short description (optional)"
                        value={newDesc}
                        onChange={(e) => setNewDesc(e.target.value)}
                        loading={creating}
                        shimmer={creating}
                      />
                      <div className="mt-2">
                        <div className="flex items-center gap-2 text-xs opacity-70 mb-1">
                          <TagIcon className="size-3" /> Tags
                        </div>
                        <TagInput value={newTags} onChange={setNewTags} suggestions={allTagsRaw} loading={creating} />
                      </div>
                      <div className="mt-2">
                        <div className="text-xs opacity-70 mb-1">Content (JSON or plain text)</div>
                        <Textarea rows={6} placeholder="Paste structured JSON or free text." value={newContent} onChange={(e) => setNewContent(e.target.value)} loading={creating} shimmer={creating} />
                      </div>
                      <div className="mt-3 flex justify-end">
                        <Button onClick={createManualContext} loading={creating} loadingText="Creating…">
                          Create Context
                        </Button>
                      </div>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </section>

          {/* Main grid */}
          <main className="mx-auto max-w-7xl p-4">
            <div className="grid grid-cols-1 lg:grid-cols-[260px,minmax(0,1fr),360px] gap-4">
              {/* left rail */}
              <div className="space-y-3 lg:sticky lg:top-4 lg:self-start">
                <TagFilterBox
                  allTags={allTagsRaw}
                  selected={selectedTags}
                  onToggle={(t) => setSelectedTags((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]))}
                  onClear={() => setSelectedTags([])}
                  collapsedCount={18}
                  loading={!!isLoading}
                />
                <div className="rounded-xl border p-3 text-xs opacity-80">
                  <div className="font-medium text-sm mb-1">Tips</div>
                  {isLoading ? (
                    <div className="space-y-2">
                      <Skeleton className="h-3 w-3/5" />
                      <Skeleton className="h-3 w-2/3" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                  ) : (
                    <ul className="list-disc pl-4 space-y-1">
                      <li>Star favorites to pin them (only your own contexts).</li>
                      <li>Use Generate for fast boilerplates; Manual for full control.</li>
                      <li>Public contexts are visible to everyone; import them to edit.</li>
                    </ul>
                  )}
                </div>
              </div>

              {/* results */}
              <section className="min-w-0">
                {isLoading ? (
                  <ul className={cx(view === 'grid' ? 'grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-3' : 'space-y-2')}>
                    {Array.from({ length: 9 }).map((_, i) => (
                      <li key={i} className="h-full">
                        <div className="relative h-full rounded-2xl border bg-background/60 overflow-hidden p-4">
                          <ShimmerOverlay show />
                          <div className="flex items-start gap-3">
                            <Skeleton className="size-8 rounded-lg" />
                            <div className="min-w-0 flex-1">
                              <Skeleton className="h-4 w-1/2 mb-2" />
                              <Skeleton className="h-3 w-4/5 mb-1.5" />
                              <Skeleton className="h-3 w-3/5" />
                              <div className="mt-3 flex gap-1.5">
                                <Skeleton className="h-5 w-16 rounded-full" />
                                <Skeleton className="h-5 w-12 rounded-full" />
                                <Skeleton className="h-5 w-20 rounded-full" />
                              </div>
                            </div>
                          </div>
                          <div className="mt-4 flex items-center justify-between">
                            <Skeleton className="h-8 w-24 rounded-md" />
                            <div className="flex gap-2">
                              <Skeleton className="size-8 rounded-md" />
                              <Skeleton className="size-8 rounded-md" />
                            </div>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : filtered.length === 0 ? (
                  <div className="p-8 text-sm border rounded-2xl bg-background/60 text-center">
                    <div className="font-medium mb-1">No contexts found</div>
                    <div className="opacity-70">Try adjusting your search or filters.</div>
                  </div>
                ) : view === 'grid' ? (
                  <ul className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-3 items-stretch">
                    {filtered.map((c) => {
                      const structured = parseStructured(c.content);
                      const title = cleanTitle(structured?.title || c.name);
                      const isPublished = !!c.publicId;
                      const canImport = !c.owner && !!c.publicId;

                      const likeBusy = pending.like.has(c.id);
                      const delBusy = pending.del.has(c.id);
                      const pubBusy = pending.pub.has(c.id);
                      const unpubBusy = c.publicId ? pending.unpub.has(c.publicId) : false;
                      const impBusy = c.publicId ? pending.imp.has(c.publicId) : false;

                      const starDisabled = scope === 'public' || !c.owner;

                      return (
                        <li key={c.id} className="h-full">
                          <article
                            className={cx(
                              'group relative h-full rounded-2xl border bg-background/70 transition shadow-sm hover:shadow-md',
                              'flex flex-col p-3',
                            )}
                            role="button"
                            tabIndex={0}
                            onClick={() => setActiveId(c.id)}
                            onKeyDown={(e) => e.key === 'Enter' && setActiveId(c.id)}
                          >
                            {/* header */}
                            <div className="flex items-start gap-3 min-w-0">
                              <div className="grid place-items-center rounded-lg border size-8 shrink-0 text-foreground/70">
                                <LibraryBig className="size-4" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 min-w-0">
                                  <h3 className="text-sm font-semibold truncate">{title}</h3>
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
                                <p className="mt-0.5 text-xs opacity-70 line-clamp-3">{structured?.description || c.description || '—'}</p>
                              </div>
                            </div>

                            {/* tags */}
                            {c.tags?.length > 0 && (
                              <div className="mt-3 flex flex-wrap gap-1.5">
                                {c.tags.slice(0, 5).map((t) => (
                                  <span key={t} className="inline-flex items-center rounded-full border px-2 py-0.5 text-[10px]" style={{ background: colorFromTag(t), borderColor: 'transparent' }}>
                                    #{t}
                                  </span>
                                ))}
                                {c.tags.length > 5 && (
                                  <Badge variant="outline" className="text-[10px] opacity-70">
                                    +{c.tags.length - 5}
                                  </Badge>
                                )}
                              </div>
                            )}

                            {/* footer */}
                            <div className="mt-auto pt-2 flex items-center justify-between">
                              {/* Primary CTA */}
                              {c.owner ? (
                                isPublished ? (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-8 text-xs"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (!unpubBusy) unpublishContext(c.publicId!);
                                    }}
                                    loading={unpubBusy}
                                    loadingText="…"
                                  >
                                    Unpublish
                                  </Button>
                                ) : (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-8 text-xs"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (!pubBusy) publishContext(c.id);
                                    }}
                                    loading={pubBusy}
                                    loadingText="…"
                                  >
                                    Publish
                                  </Button>
                                )
                              ) : canImport ? (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-8 text-xs"
                                  onClick={async (e) => {
                                    e.stopPropagation();
                                    try {
                                      const imported = await importPublicContext(c.publicId!);
                                      setActiveId(imported.id);
                                      toast({ type: 'success', description: 'Added to your library.' });
                                    } catch (err: any) {
                                      toast({ type: 'error', description: err?.message || 'Import failed' });
                                    }
                                  }}
                                  loading={impBusy}
                                  loadingText="…"
                                >
                                  Import
                                </Button>
                              ) : (
                                <span className="text-[11px] opacity-60">Shared</span>
                              )}

                              {/* Action bar */}
                              <div className="flex items-center gap-1.5">
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      className={cx('size-8', c.liked ? 'text-yellow-500' : 'text-foreground/60')}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        if (!starDisabled && !likeBusy) toggleLike(c.id, !!c.liked);
                                      }}
                                      aria-label={c.liked ? 'Unstar' : 'Star'}
                                      loading={likeBusy}
                                      disabled={starDisabled}
                                    >
                                      <Star className={cx('size-4', c.liked && 'fill-yellow-500')} />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>{starDisabled ? 'Star from Mine/All' : c.liked ? 'Unstar' : 'Star'}</TooltipContent>
                                </Tooltip>

                                {c.owner && (
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        size="icon"
                                        variant="ghost"
                                        className="size-8 text-rose-500"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          if (!delBusy) deleteContext(c.id);
                                        }}
                                        aria-label="Delete"
                                        loading={delBusy}
                                      >
                                        <Trash2 className="size-4" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Delete</TooltipContent>
                                  </Tooltip>
                                )}
                              </div>
                            </div>

                            {/* hover ring */}
                            <span className="pointer-events-none absolute inset-0 rounded-2xl ring-0 ring-indigo-500/0 group-hover:ring-2 group-hover:ring-indigo-500/20 transition" />
                          </article>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <ul className="space-y-2">
                    {filtered.map((c) => {
                      const structured = parseStructured(c.content);
                      const title = cleanTitle(structured?.title || c.name);
                      const isPublished = !!c.publicId;
                      const canImport = !c.owner && !!c.publicId;

                      const likeBusy = pending.like.has(c.id);
                      const delBusy = pending.del.has(c.id);
                      const pubBusy = pending.pub.has(c.id);
                      const unpubBusy = c.publicId ? pending.unpub.has(c.publicId) : false;
                      const impBusy = c.publicId ? pending.imp.has(c.publicId) : false;

                      const starDisabled = scope === 'public' || !c.owner;

                      return (
                        <li key={c.id}>
                          <article
                            className="group relative rounded-2xl border bg-background/70 hover:bg-background/90 transition px-4 py-3"
                            onClick={() => setActiveId(c.id)}
                            role="button"
                            tabIndex={0}
                            onKeyDown={(e) => e.key === 'Enter' && setActiveId(c.id)}
                          >
                            <div className="flex items-start gap-3 min-w-0">
                              <div className="grid place-items-center rounded-lg border size-7 shrink-0 text-foreground/70">
                                <LibraryBig className="size-4" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 min-w-0">
                                  <h3 className="text-sm font-semibold truncate">{title}</h3>
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
                                <p className="text-xs opacity-70 line-clamp-2">{structured?.description || c.description || '—'}</p>

                                {c.tags?.length > 0 && (
                                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                                    {c.tags.slice(0, 5).map((t) => (
                                      <span key={t} className="inline-flex items-center rounded-full border px-2 py-0.5 text-[10px]" style={{ background: colorFromTag(t), borderColor: 'transparent' }}>
                                        #{t}
                                      </span>
                                    ))}
                                    {c.tags.length > 5 && (
                                      <Badge variant="outline" className="text-[10px] opacity-70">
                                        +{c.tags.length - 5}
                                      </Badge>
                                    )}
                                  </div>
                                )}
                              </div>

                              {/* compact action bar */}
                              <div className="flex items-center gap-1 ml-2">
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      className={cx('size-7', c.liked ? 'text-yellow-500' : 'text-foreground/60')}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        if (!starDisabled && !likeBusy) toggleLike(c.id, !!c.liked);
                                      }}
                                      aria-label={c.liked ? 'Unstar' : 'Star'}
                                      loading={likeBusy}
                                      disabled={starDisabled}
                                    >
                                      <Star className={cx('size-4', c.liked && 'fill-yellow-500')} />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>{starDisabled ? 'Star from Mine/All' : c.liked ? 'Unstar' : 'Star'}</TooltipContent>
                                </Tooltip>

                                {c.owner ? (
                                  <>
                                    {c.publicId ? (
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="h-7"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          if (!unpubBusy) unpublishContext(c.publicId!);
                                        }}
                                        loading={unpubBusy}
                                        loadingText="…"
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
                                          if (!pubBusy) publishContext(c.id);
                                        }}
                                        loading={pubBusy}
                                        loadingText="…"
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
                                        if (!delBusy) deleteContext(c.id);
                                      }}
                                      aria-label="Delete"
                                      loading={delBusy}
                                    >
                                      <Trash2 className="size-4" />
                                    </Button>
                                  </>
                                ) : canImport ? (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-7"
                                    onClick={async (e) => {
                                      e.stopPropagation();
                                      try {
                                        const imported = await importPublicContext(c.publicId!);
                                        setActiveId(imported.id);
                                        toast({ type: 'success', description: 'Added to your library.' });
                                      } catch (err: any) {
                                        toast({ type: 'error', description: err?.message || 'Import failed' });
                                      }
                                    }}
                                    loading={impBusy}
                                    loadingText="…"
                                  >
                                    Import
                                  </Button>
                                ) : null}
                              </div>
                            </div>
                          </article>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>

              {/* inspector */}
              <aside className="hidden lg:block lg:sticky lg:top-4 lg:self-start">
                <div className="relative rounded-2xl border bg-background/70 backdrop-blur p-0 overflow-hidden">
                  {/* gradient frame */}
                  <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-indigo-500/40 via-fuchsia-500/40 to-transparent" />
                  {/* ambient blobs */}
                  <div className="pointer-events-none absolute -top-24 -right-24 size-56 rounded-full bg-indigo-500/10 blur-3xl" />
                  <div className="pointer-events-none absolute -bottom-24 -left-24 size-56 rounded-full bg-fuchsia-500/10 blur-3xl" />

                  <div className="p-3">
                    {!active ? (
                      isLoading ? (
                        <div className="space-y-3">
                          <div className="flex items-start gap-2">
                            <Skeleton className="size-10 rounded-lg" />
                            <div className="flex-1">
                              <Skeleton className="h-4 w-3/5 mb-2" />
                              <Skeleton className="h-3 w-1/2" />
                            </div>
                            <Skeleton className="size-8 rounded-md" />
                          </div>
                          <Skeleton className="h-3 w-full" />
                          <Skeleton className="h-3 w-4/5" />
                          <div className="flex gap-2 mt-2">
                            <Skeleton className="h-8 w-28" />
                            <Skeleton className="h-8 w-32" />
                          </div>
                        </div>
                      ) : (
                        /* pretty empty state */
                        <div className="relative h-full grid place-items-center text-center p-6">
                          <div className="max-w-[95%] space-y-5">
                            <div className="mx-auto grid place-items-center">
                              <div className="relative">
                                <div className="absolute -inset-3 rounded-2xl bg-gradient-to-tr from-indigo-500/20 to-fuchsia-500/20 blur-xl" />
                                <div className="relative grid place-items-center rounded-xl border bg-background/80 border-indigo-500/30 text-indigo-600 size-14 shadow-sm">
                                  <LumachorMark />
                                </div>
                              </div>
                            </div>

                            <div>
                              <h3 className="text-base font-semibold">No context selected</h3>
                              <p className="text-sm opacity-70 mt-0.5">Pick a card to preview details — or create/import something new.</p>
                            </div>

                            <div className="flex flex-wrap items-center justify-center gap-2">
                              <Button size="sm" className="text-xs" variant="outline" onClick={() => setScope('public')}>
                                <Search className="mr-2 size-4" />
                                Browse Public
                              </Button>
                              <Button size="sm" className="text-xs" onClick={() => setCreateOpen(true)}>
                                <Plus className="mr-2 size-4" />
                                New Context
                              </Button>
                              {filtered.length > 0 ? (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="text-xs"
                                  onClick={() => setActiveId(filtered[Math.floor(Math.random() * filtered.length)].id)}
                                >
                                  <Sparkles className="mr-2 size-4" />
                                  Surprise me
                                </Button>
                              ) : null}
                            </div>

                            {allTagsRaw.length > 0 && (
                              <div className="mt-1">
                                <div className="text-[11px] opacity-70 mb-1">Try filtering by a tag</div>
                                <div className="flex flex-wrap justify-center gap-1.5">
                                  {allTagsRaw.slice(0, 8).map((t) => (
                                    <button
                                      key={t}
                                      onClick={() => setSelectedTags((prev) => (prev.includes(t) ? prev : [...prev, t]))}
                                      className="inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] transition hover:bg-foreground/5"
                                      style={{ background: colorFromTag(t), borderColor: 'transparent' }}
                                    >
                                      #{t}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-left">
                              <div className="rounded-xl border p-2 bg-background/60">
                                <div className="flex items-center gap-2 text-xs font-medium">
                                  <Search className="size-3.5 opacity-70" />
                                  Quick preview
                                </div>
                                <div className="text-[11px] opacity-70 mt-1">Search titles, descriptions, or goals.</div>
                              </div>
                              <div className="rounded-xl border p-2 bg-background/60">
                                <div className="flex items-center gap-2 text-xs font-medium">
                                  <Star className="size-3.5 opacity-70" />
                                  Pin favorites
                                </div>
                                <div className="text-[11px] opacity-70 mt-1">
                                  Star your own contexts from <span className="font-medium">Mine</span> or <span className="font-medium">All</span>.
                                </div>
                              </div>
                              <div className="rounded-xl border p-2 bg-background/60">
                                <div className="flex items-center gap-2 text-xs font-medium">
                                  <Sparkles className="size-3.5 opacity-70" />
                                  Generate fast
                                </div>
                                <div className="text-[11px] opacity-70 mt-1">
                                  Use <span className="font-medium">New → Generate</span> for a head start.
                                </div>
                              </div>
                            </div>

                            <div className="text-[11px] opacity-60">Pro tip: ↑/↓ + Enter to open inspector actions</div>
                          </div>
                        </div>
                      )
                    ) : (
                      <>
                        {/* header */}
                        <div className="flex items-start gap-3">
                          <div className="grid place-items-center rounded-lg border size-11 shrink-0 text-foreground/70 bg-background/80">
                            <LibraryBig className="size-5" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 min-w-0">
                              <h3 className="font-semibold truncate">{cleanTitle(parseStructured(active.content)?.title || active.name)}</h3>
                              {active.owner && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-medium text-emerald-700">You</span>
                              )}
                              {active.publicId && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-medium text-amber-700">Public</span>
                              )}
                            </div>
                            <div className="text-[11px] opacity-70 mt-0.5 flex flex-wrap items-center gap-2">
                              <span>{active.owner ? 'Owned by you' : 'Shared'}</span>
                              {active.createdAt ? <span className="opacity-60">• Created {new Date(active.createdAt).toLocaleDateString()}</span> : null}
                              {active.tags?.length ? <span className="opacity-60">• {active.tags.length} tag{active.tags.length > 1 ? 's' : ''}</span> : null}
                            </div>
                          </div>
                          <Button size="icon" variant="ghost" onClick={() => setActiveId(null)}>
                            <X className="size-4" />
                          </Button>
                        </div>

                        {/* separator */}
                        <div className="my-3 h-px bg-foreground/10" />

                        {/* description */}
                        <p className="text-sm opacity-80">{parseStructured(active.content)?.description || active.description || '—'}</p>

                        {/* tags */}
                        {active.tags?.length ? (
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {active.tags.map((t) => (
                              <span key={t} className="inline-flex items-center rounded-full border px-2 py-0.5 text-[10px]" style={{ background: colorFromTag(t), borderColor: 'transparent' }}>
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
                            <div className="mt-3 grid gap-3">
                              {sc.background_goals?.length ? (
                                <div className="rounded-xl border bg-background/60 p-2.5">
                                  <div className="text-[11px] font-medium opacity-70 mb-1">Goals</div>
                                  <ul className="text-[12px] space-y-1 list-disc pl-4">{sc.background_goals.map((g, i) => <li key={i}>{g}</li>)}</ul>
                                </div>
                              ) : null}
                              {sc.example_prompts?.length ? (
                                <div className="rounded-xl border bg-background/60 p-2.5">
                                  <div className="text-[11px] font-medium opacity-70 mb-1">Examples</div>
                                  <ul className="text-[12px] space-y-1 list-disc pl-4">{sc.example_prompts.map((g, i) => <li key={i} className="break-words">{g}</li>)}</ul>
                                </div>
                              ) : null}
                            </div>
                          );
                        })()}

                        {/* action bar */}
                        <div className="mt-3 rounded-xl border bg-background/60 p-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <Button size="sm" onClick={() => void openInChat(active)} className="h-8">
                              Use in chat
                            </Button>

                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-8"
                                    onClick={() => {
                                      navigator.clipboard.writeText(active.content).then(
                                        () => toast({ type: 'success', description: 'Copied JSON/text content.' }),
                                        () => toast({ type: 'error', description: 'Copy failed.' }),
                                      );
                                    }}
                                  >
                                    <Copy className="size-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Copy context</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>

                            {active.publicId ? (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="h-8"
                                      onClick={() => {
                                        const url = `${location.origin}/public/${active.publicId}`;
                                        navigator.clipboard.writeText(url);
                                        toast({ type: 'success', description: 'Public link copied.' });
                                      }}
                                    >
                                      <LinkIcon className="size-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Copy link</TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            ) : null}

                            {/* Star disabled for Public scope or non-owned */}
                            <Button
                              size="sm"
                              variant={active.liked ? 'default' : 'outline'}
                              className="h-8"
                              onClick={() => {
                                if (!(scope === 'public' || !active.owner)) toggleLike(active.id, !!active.liked);
                              }}
                              loading={pending.like.has(active.id)}
                              disabled={scope === 'public' || !active.owner}
                              title={scope === 'public' || !active.owner ? 'Star from Mine/All' : undefined}
                            >
                              <Star className={cx('size-4', active.liked && 'fill-yellow-500 text-yellow-500')} />
                            </Button>

                            <div className="ml-auto flex items-center gap-2">
                              {active.owner ? (
                                <>
                                  {active.publicId ? (
                                    <TooltipProvider>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            className="h-8"
                                            onClick={() => unpublishContext(active.publicId!)}
                                            loading={pending.unpub.has(active.publicId!)}
                                            loadingText="…"
                                          >
                                            <UploadCloud className="size-4" />
                                          </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>Unpublish context</TooltipContent>
                                      </Tooltip>
                                    </TooltipProvider>
                                  ) : (
                                    <TooltipProvider>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            className="h-8"
                                            onClick={() => publishContext(active.id)}
                                            loading={pending.pub.has(active.id)}
                                            loadingText="…"
                                          >
                                            <UploadCloud className="size-4" />
                                          </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>Publish context</TooltipContent>
                                      </Tooltip>
                                    </TooltipProvider>
                                  )}
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button
                                          size="sm"
                                          variant="destructive"
                                          className="h-8"
                                          onClick={() => deleteContext(active.id)}
                                          loading={pending.del.has(active.id)}
                                          loadingText="…"
                                        >
                                          <Trash2 className="size-4" />
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>Delete context</TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                </>
                              ) : active.publicId ? (
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="h-8"
                                        onClick={async () => {
                                          try {
                                            const imported = await importPublicContext(active.publicId!);
                                            setActiveId(imported.id);
                                            toast({ type: 'success', description: 'Added to your library.' });
                                          } catch (err: any) {
                                            toast({ type: 'error', description: err?.message || 'Import failed' });
                                          }
                                        }}
                                        loading={pending.imp.has(active.publicId!)}
                                        loadingText="…"
                                      >
                                        <Download className="size-4" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Import context</TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </aside>
            </div>
          </main>
        </div>
      </div>
    </TooltipProvider>
  );
}

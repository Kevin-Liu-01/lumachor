'use client';

import * as React from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import useSWR from 'swr';
import cx from 'classnames';
import {
  BadgeCheck,
  Check,
  CheckCircle2,
  Hash,
  LibraryBig,
  Plus,
  Search,
  Sparkles,
  Tag as TagIcon,
  X,
  Filter,
  ChevronDown,
  Star,
  Trash2,
} from 'lucide-react';

import { fetcher } from '@/lib/utils';
import { toast } from '@/components/toast';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Textarea } from '@/components/ui/textarea';

import type { ContextRow } from './context-selected-bar';

/* ------------------------------------------------------------------ */
/* Types & parsing                                                     */
/* ------------------------------------------------------------------ */

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

function cleanTitle(s: string) {
  return s.replace(/^\s*(?:\*\*Title\*\*|#+)\s*/i, '').trim();
}

function parseStructured(content: string): StructuredContext | null {
  try {
    const obj = JSON.parse(content);
    if (obj && typeof obj === 'object' && typeof (obj as any).title === 'string') {
      return obj as StructuredContext;
    }
  } catch {}
  return null;
}

function unique<T>(arr: T[]): T[] {
  return Array.from(new Set(arr));
}

/* ------------------------------------------------------------------ */
/* Small helpers                                                       */
/* ------------------------------------------------------------------ */

function colorFromTag(tag: string) {
  const hues = [262, 280, 200, 150, 20, 330, 210, 100, 40, 0];
  const i = [...tag].reduce((acc, ch) => (acc + ch.charCodeAt(0)) | 0, 0) % hues.length;
  const h = hues[i];
  return `hsl(${h} 85% 45% / 0.25)`;
}

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
      {active && <Check className="size-3.5 opacity-80" />}
    </button>
  );
}

function TagFilter({
  allTags,
  selected,
  onToggle,
  onClear,
  collapsedCount = 14,
  enableSearch = true,
}: {
  allTags: string[];
  selected: string[];
  onToggle: (tag: string) => void;
  onClear: () => void;
  collapsedCount?: number;
  enableSearch?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');

  const filtered = useMemo(() => {
    if (!q.trim()) return allTags;
    const d = q.toLowerCase();
    return allTags.filter((t) => t.toLowerCase().includes(d));
  }, [allTags, q]);

  const visible = useMemo(() => {
    if (open) return filtered;
    return filtered.slice(0, collapsedCount);
  }, [filtered, open, collapsedCount]);

  const remaining = Math.max(0, filtered.length - visible.length);

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm opacity-80">Filter by tags</span>
        <button
          type="button"
          onClick={onClear}
          className="text-xs underline opacity-70 hover:opacity-100"
          aria-label="Clear tag filters"
        >
          Clear
        </button>
        <div className="ml-auto flex items-center gap-2">
          {enableSearch && (
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 size-3.5 opacity-60" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search tags…"
                className="pl-7 pr-2 py-1 text-xs rounded border bg-background/70 backdrop-blur min-w-[160px]"
                aria-label="Search tags"
              />
            </div>
          )}
          <Button
            size="sm"
            variant="outline"
            className="h-7"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-controls="tag-filter-list"
          >
            {open ? 'Show less' : 'Show more'}
          </Button>
        </div>
      </div>

      <div id="tag-filter-list" className="flex flex-wrap gap-1.5" role="listbox" aria-label="Tag filters">
        <SoftTag label="all" active={selected.length === 0} onClick={onClear} />
        {visible.map((t) => (
          <SoftTag key={t} label={t} active={selected.includes(t)} onClick={() => onToggle(t)} />
        ))}
        {!open && remaining > 0 && (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[11px] opacity-80 hover:opacity-100"
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

/* ------------------------------------------------------------------ */
/* TagInput (inline suggestions)                                       */
/* ------------------------------------------------------------------ */

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
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpenSugs(false);
      }
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
    return suggestions
      .filter((s) => s.toLowerCase().includes(d) && !lower.includes(s.toLowerCase()))
      .slice(0, 16);
  }, [draft, suggestions, lower]);

  return (
    <div ref={containerRef} className="w-full relative">
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
            className="flex-1 min-w-[120px] bg-transparent outline-none text-sm px-1 py-0.5"
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
              <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
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
              <div className="mt-2 text-[11px] opacity-60 px-1">
                Press <kbd className="px-1 border rounded">Enter</kbd> to add custom tag
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

export function ContextLibraryDock({
  open,
  onClose,
  onSelect,
  selectedContextId,
  reloadContexts,
}: {
  open: boolean;
  onClose: () => void;
  onSelect: (row: ContextRow) => void;
  selectedContextId: string | null;
  reloadContexts?: () => Promise<any> | void;
}) {
  const [scope, setScope] = useState<Scope>('all');

  const key =
    open
      ? scope === 'public'
        ? '/api/public-contexts'
        : `/api/contexts?withMeta=1${scope === 'mine' ? '&mine=1' : ''}${scope === 'starred' ? '&starred=1' : ''}`
      : null;

  const { data, isLoading, mutate } = useSWR<{ contexts: ContextRowWithMeta[] }>(key, fetcher);

  const [query, setQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [matchMode, setMatchMode] = useState<'any' | 'all'>('any');

  // creators
  const [genPrompt, setGenPrompt] = useState('');
  const [genTags, setGenTags] = useState<string[]>([]);
  const [genBusy, setGenBusy] = useState(false);

  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newTags, setNewTags] = useState<string[]>([]);
  const [newContent, setNewContent] = useState('');
  const [creating, setCreating] = useState(false);

  // keyboard nav
  const [activeIndex, setActiveIndex] = useState<number>(-1);

  const contexts = useMemo(() => data?.contexts ?? [], [data?.contexts]);

  const allTagsRaw = useMemo(() => unique(contexts.flatMap((c) => c.tags || [])).sort(), [contexts]);

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
      const comp = (tags: string[]) => {
        const set = new Set((tags || []).map((t) => t.toLowerCase()));
        return matchMode === 'any'
          ? selectedTags.some((t) => set.has(t.toLowerCase()))
          : selectedTags.every((t) => set.has(t.toLowerCase()));
      };
      items = items.filter((c) => comp(c.tags || []));
    }
    return items;
  }, [contexts, query, selectedTags, matchMode]);

  // keyboard
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
      if (filtered.length === 0) return;
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIndex((i) => Math.min(filtered.length - 1, i + 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIndex((i) => Math.max(0, i - 1));
      } else if (e.key === 'Enter' && activeIndex >= 0) {
        e.preventDefault();
        const c = filtered[activeIndex];
        if (c) onSelect(c);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, filtered, activeIndex, onClose, onSelect]);

  /* --------------------------- Actions -------------------------------- */

  async function handleQuickGenerate() {
    if (!genPrompt.trim()) return;
    setGenBusy(true);
    try {
      const res = await fetch('/api/contexts/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userPrompt: genPrompt, tags: genTags, model: 'chat-model' }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.message || 'Failed to generate');
      }
      setGenPrompt('');
      setGenTags([]);
      await reloadContexts?.();
      await mutate();
      toast({ type: 'success', description: 'Context generated!' });
    } catch (e: any) {
      toast({ type: 'error', description: e?.message || 'Failed to generate context' });
    } finally {
      setGenBusy(false);
    }
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
        body: JSON.stringify({
          name: newTitle,
          description: newDesc,
          tags: newTags,
          content: newContent,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.message || 'Failed to create context');
      }
      setNewTitle('');
      setNewDesc('');
      setNewTags([]);
      setNewContent('');
      await reloadContexts?.();
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
    mutate({ contexts: next }, { revalidate: false });
    try {
      const res = await fetch(`/api/contexts/${id}`, { method: 'PATCH' }); // body not required
      if (!res.ok) throw new Error('Failed to toggle star');
      await mutate();
    } catch {
      mutate({ contexts: prev }, { revalidate: false });
      toast({ type: 'error', description: 'Could not update star.' });
    }
  }

  async function deleteContext(id: string) {
    const prev = contexts;
    const next = prev.filter((c) => c.id !== id);
    mutate({ contexts: next }, { revalidate: false });
    try {
      const res = await fetch(`/api/contexts/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');
      await mutate();
      toast({ type: 'success', description: 'Context deleted.' });
    } catch {
      mutate({ contexts: prev }, { revalidate: false });
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

  /* --------------------------- UI -------------------------------- */

  return (
    <AnimatePresence>
      {open && (
        <motion.aside
          initial={{ x: 360, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 360, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 260, damping: 26 }}
          className={cx(
            'fixed top-0 right-0 z-50 h-dvh w-full max-w-[480px]',
            'border-l bg-background/80 backdrop-blur-md shadow-xl',
          )}
          role="dialog"
          aria-label="Context Library"
        >
          {/* subtle glow */}
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute -right-28 -top-28 size-60 rounded-full bg-fuchsia-500/10 blur-3xl" />
            <div className="absolute -left-24 -bottom-24 size-60 rounded-full bg-indigo-500/10 blur-3xl" />
          </div>

          {/* Header */}
          <div className="sticky top-0 z-10 border-b bg-background/70 backdrop-blur">
            <div className="flex items-center justify-between px-3 py-2">
              <div className="flex items-center gap-2">
                <div className="grid place-items-center rounded-lg border bg-background/80 p-1.5 text-indigo-600 border-indigo-500/30">
                  <LibraryBig className="size-4" />
                </div>
                <div className="font-medium">Context Library</div>
                <div className="text-xs opacity-70 ml-2 tabular-nums">
                  {isLoading ? '…' : `${(data?.contexts ?? []).length}`} items
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close">
                <X className="size-4" />
              </Button>
            </div>

            {/* Tabs */}
            <div className="px-3 pb-2">
              <div className="inline-flex gap-1 rounded-xl border p-1 bg-background/60">
                {(['all', 'mine', 'starred', 'public'] as Scope[]).map((s) => (
                  <Button
                    key={s}
                    size="sm"
                    variant={scope === s ? 'default' : 'ghost'}
                    className="h-8 px-3"
                    onClick={() => {
                      setScope(s);
                      setActiveIndex(-1);
                    }}
                  >
                    {s[0].toUpperCase() + s.slice(1)}
                  </Button>
                ))}
              </div>
            </div>

            {/* Search + Tags + Create */}
            <div className="px-3 pb-3 space-y-3">
              {/* Search */}
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 size-4 opacity-60" />
                  <Input
                    className="pl-8"
                    placeholder="Search by title, description, or goals"
                    value={query}
                    onChange={(e) => {
                      setQuery(e.target.value);
                      setActiveIndex(-1);
                    }}
                  />
                </div>
                <div className="hidden md:block text-xs opacity-70 px-1">↑/↓, Enter</div>
              </div>

              {/* Tags */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Hash className="size-4 opacity-70" />
                  <span className="text-sm opacity-80">Tags</span>
                  <div className="ml-auto flex items-center gap-1">
                    <Button
                      size="sm"
                      variant={matchMode === 'any' ? 'default' : 'outline'}
                      onClick={() => setMatchMode('any')}
                      className="h-7"
                    >
                      ANY
                    </Button>
                    <Button
                      size="sm"
                      variant={matchMode === 'all' ? 'default' : 'outline'}
                      onClick={() => setMatchMode('all')}
                      className="h-7"
                    >
                      ALL
                    </Button>
                  </div>
                </div>

                <TagFilter
                  allTags={allTagsRaw}
                  selected={selectedTags}
                  onToggle={(t) =>
                    setSelectedTags((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]))
                  }
                  onClear={() => setSelectedTags([])}
                  collapsedCount={14}
                  enableSearch
                />
              </div>

              {/* Creators (collapsed by default to declutter) */}
              <details className="rounded-2xl border bg-background/70 backdrop-blur p-3" open={false}>
                <summary className="flex cursor-pointer list-none items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Plus className="size-4" />
                    <span className="text-sm font-medium">Create</span>
                  </div>
                  <div className="text-xs opacity-70 flex items-center gap-1">
                    <Filter className="size-3" /> Manual & Quick Generate
                  </div>
                </summary>

                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  {/* Manual */}
                  <div className="rounded-xl border p-3">
                    <div className="text-sm font-medium mb-2">Manual</div>
                    <Input placeholder="Title" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} />
                    <Input
                      className="mt-2"
                      placeholder="Short description (optional)"
                      value={newDesc}
                      onChange={(e) => setNewDesc(e.target.value)}
                    />
                    <div className="mt-2">
                      <div className="flex items-center gap-2 text-xs opacity-70 mb-1">
                        <TagIcon className="size-3" /> Tags
                      </div>
                      <div className="relative">
                        <TagInput value={newTags} onChange={setNewTags} suggestions={allTagsRaw} />
                      </div>
                    </div>
                    <div className="mt-2">
                      <div className="text-xs opacity-70 mb-1">Content (JSON or plain text)</div>
                      <Textarea
                        rows={5}
                        placeholder="Paste structured JSON or free text."
                        value={newContent}
                        onChange={(e) => setNewContent(e.target.value)}
                      />
                    </div>
                    <div className="mt-2 flex justify-end">
                      <Button onClick={createManualContext} disabled={creating || !newTitle.trim() || !newContent.trim()}>
                        {creating ? 'Creating…' : 'Create Context'}
                      </Button>
                    </div>
                  </div>

                  {/* Quick generate */}
                  <div className="rounded-xl border p-3">
                    <div className="text-sm font-medium mb-2">Quick Generate</div>
                    <Input
                      placeholder="What should this assistant specialize in?"
                      value={genPrompt}
                      onChange={(e) => setGenPrompt(e.target.value)}
                    />
                    <div className="mt-2">
                      <div className="flex items-center gap-2 text-xs opacity-70 mb-1">
                        <TagIcon className="size-3" /> Tags
                      </div>
                      <div className="relative">
                        <TagInput value={genTags} onChange={setGenTags} suggestions={allTagsRaw} />
                      </div>
                    </div>
                    <div className="mt-2 flex justify-end">
                      <Button onClick={handleQuickGenerate} disabled={genBusy || !genPrompt.trim()}>
                        {genBusy ? 'Generating…' : 'Generate'}
                      </Button>
                    </div>
                  </div>
                </div>
              </details>
            </div>
          </div>

          {/* List */}
          <div className="h-[calc(100dvh-280px)] overflow-y-auto p-3">
            {isLoading ? (
              <div className="p-3 text-sm opacity-70">Loading contexts…</div>
            ) : filtered.length === 0 ? (
              <div className="p-3 text-sm opacity-70">No contexts found. Try adjusting search or tags.</div>
            ) : (
              <ul className="space-y-2">
                {filtered.map((c, idx) => {
                  const active = selectedContextId === c.id;
                  const structured = parseStructured(c.content);
                  const title = cleanTitle(structured?.title || c.name);
                  const isFocused = idx === activeIndex;
                  const isPublished = !!c.publicId;

                  return (
                    <li key={c.id}>
                      <div
                        className={cx(
                          'group w-full rounded-2xl border px-3.5 py-2.5 transition relative',
                          'bg-background/70 hover:bg-background/90 backdrop-blur-sm',
                          active
                            ? 'border-indigo-500/50 shadow-[0_0_0_2px_hsla(252,95%,60%,0.15)_inset]'
                            : 'border-foreground/10 hover:border-foreground/20',
                          isFocused && 'ring-2 ring-indigo-500/40',
                        )}
                      >
                        {active && (
                          <span
                            className="absolute left-0 top-0 h-full w-1.5 rounded-l-2xl"
                            style={{ background: 'linear-gradient(180deg,#6366f1,#ec4899)' }}
                          />
                        )}

                        <div className="flex items-start gap-3">
                          <button
                            onClick={() => onSelect(c)}
                            className="mt-0.5 grid place-items-center rounded-lg border size-6 shrink-0 text-foreground/70 hover:text-foreground transition"
                          >
                            {active ? <BadgeCheck className="size-4 text-indigo-600" /> : <LibraryBig className="size-4" />}
                          </button>

                          <div className="min-w-0 flex-1" onClick={() => onSelect(c)}>
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
                              {active && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-indigo-500/15 px-2 py-0.5 text-[10px] font-medium text-indigo-600">
                                  <CheckCircle2 className="size-3.5" />
                                  Selected
                                </span>
                              )}
                            </div>

                            {structured?.description ? (
                              <div className="text-xs opacity-70 line-clamp-2 mt-0.5">{structured.description}</div>
                            ) : c.description ? (
                              <div className="text-xs opacity-70 line-clamp-2 mt-0.5">{c.description}</div>
                            ) : null}

                            {c.tags?.length > 0 && (
                              <div className="mt-1.5 flex flex-wrap gap-1.5">
                                {c.tags.slice(0, 8).map((t) => (
                                  <span
                                    key={t}
                                    className="inline-flex items-center rounded-full border px-2 py-0.5 text-[10px]"
                                    style={{ background: colorFromTag(t), borderColor: 'transparent' }}
                                  >
                                    #{t}
                                  </span>
                                ))}
                                {c.tags.length > 8 && (
                                  <Badge variant="outline" className="text-[10px] opacity-70">
                                    +{c.tags.length - 8}
                                  </Badge>
                                )}
                              </div>
                            )}
                          </div>

                          {/* row actions */}
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
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="h-7"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          unpublishContext(c.publicId!);
                                        }}
                                      >
                                        Remove from Public
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Unpublish from the public library</TooltipContent>
                                  </Tooltip>
                                ) : (
                                  <Tooltip>
                                    <TooltipTrigger asChild>
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
                                    </TooltipTrigger>
                                    <TooltipContent>Add to the public library</TooltipContent>
                                  </Tooltip>
                                )}

                                <Tooltip>
                                  <TooltipTrigger asChild>
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
                                  </TooltipTrigger>
                                  <TooltipContent>Delete</TooltipContent>
                                </Tooltip>
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
          </div>

          {/* Footer */}
          <div className="sticky bottom-0 border-t bg-background/70 backdrop-blur px-3 py-2">
            <div className="flex items-center justify-between gap-2">
              <div className="text-xs opacity-70 flex items-center gap-1">
                <ChevronDown className="size-3" />
                Tip: Press Esc to close
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" onClick={onClose}>
                  Close
                </Button>
              </div>
            </div>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}

'use client';

import * as React from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import useSWR from 'swr';
import cx from 'classnames';
import {
  BadgeCheck,
  CheckCircle2,
  Hash,
  LibraryBig,
  Plus,
  Search,
  Tag as TagIcon,
  X,
  ChevronDown,
  Star,
  Trash2,
  Sparkles,
} from 'lucide-react';

import { fetcher } from '@/lib/utils';
import { toast } from '@/components/toast';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Textarea } from '@/components/ui/textarea';

import type { ContextRow } from './context-selected-bar';

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

const unique = <T,>(arr: T[]) => Array.from(new Set(arr));
function cleanTitle(s: string) {
  return s.replace(/^\s*(?:\*\*Title\*\*|#+)\s*/i, '').trim();
}
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

/* --------------------- tiny ui atoms ---------------------- */

function Spinner({ className }: { className?: string }) {
  return (
    <svg className={cx('animate-spin', className)} viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
      <path className="opacity-90" fill="currentColor" d="M4 12a8 8 0 0 1 8-8v4a4 4 0 0 0-4 4H4z" />
    </svg>
  );
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
        active ? 'border-transparent bg-[--tag-bg] text-foreground'
               : 'border-foreground/15 hover:bg-foreground/5',
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
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpenSugs(false);
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

/* ---------------- tag filter box (collapsed) ---------------- */
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

  const visible = useMemo(
    () => (open ? filtered : filtered.slice(0, collapsedCount)),
    [filtered, open, collapsedCount]
  );
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
        <SoftTag
          label="all"
          active={selected.length === 0}
          onClick={onClear}
        />
        {visible.map((t) => (
          <SoftTag
            key={t}
            label={t}
            active={selected.includes(t)}
            onClick={() => onToggle(t)}
          />
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


/* --------------------- main component ---------------------- */

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

  // create section
  const [createOpen, setCreateOpen] = useState(false); // collapsible
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
      items = items.filter((c) => {
        const set = new Set((c.tags || []).map((t) => t.toLowerCase()));
        return selectedTags.some((t) => set.has(t.toLowerCase())); // ANY by default
      });
    }
    return items;
  }, [contexts, query, selectedTags]);

  // keyboard shortcuts inside dock
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

  /* --------------- actions --------------- */

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
      await reloadContexts?.();
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
      setNewTitle(''); setNewDesc(''); setNewTags([]); setNewContent('');
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
      const res = await fetch(`/api/contexts/${id}`, { method: 'PATCH' });
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

  /* ----------------------- render ------------------------ */

  return (
    <AnimatePresence>
      {open && (
        <motion.aside
          initial={{ x: 360, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 360, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 260, damping: 26 }}
          className={cx(
            'fixed top-0 right-0 z-50 h-dvh w-full max-w-[520px]',
            'border-l bg-background/80 backdrop-blur-md shadow-xl'
          )}
          role="dialog"
          aria-label="Context Library"
        >
          {/* glow */}
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute -right-28 -top-28 size-60 rounded-full bg-fuchsia-500/10 blur-3xl" />
            <div className="absolute -left-24 -bottom-24 size-60 rounded-full bg-indigo-500/10 blur-3xl" />
          </div>

          {/* header */}
          <div className="sticky top-0 z-10 border-b bg-background/70 backdrop-blur">
            <div className="flex items-center justify-between px-3 py-2">
              <div className="flex items-center gap-2">
                <div className="grid place-items-center rounded-lg border bg-background/80 p-1.5 text-indigo-600 border-indigo-500/30">
                  <LibraryBig className="size-4" />
                </div>
                <div className="font-medium">Context Library</div>
                <div className="text-xs opacity-70 ml-2 tabular-nums">{isLoading ? '…' : `${(data?.contexts ?? []).length}`} items</div>
              </div>
              <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close">
                <X className="size-4" />
              </Button>
            </div>

            {/* scope */}
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

            {/* search + tags + create (collapsible) */}
            <div className="px-3 pb-3 space-y-3">
              {/* search */}
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

              {/* tags box */}
              <TagFilterBox
                allTags={allTagsRaw}
                selected={selectedTags}
                onToggle={(t) =>
                  setSelectedTags((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]))
                }
                onClear={() => setSelectedTags([])}
                collapsedCount={14}
              />

              {/* create collapsible — prominent summary */}
              <div className="relative rounded-2xl border overflow-hidden">
                <button
                  type="button"
                  onClick={() => setCreateOpen((v) => !v)}
                  className={cx(
                    'w-full flex items-center justify-between px-3 py-2',
                    'bg-gradient-to-r from-indigo-500/10 via-fuchsia-500/5 to-transparent'
                  )}
                  aria-expanded={createOpen}
                >
                  <span className="flex items-center gap-2 text-sm font-medium">
                    <Plus className="size-4" />
                    Create a new context
                  </span>
                  <span className="text-xs opacity-70">{createOpen ? 'Hide' : 'Expand'}</span>
                </button>

                <AnimatePresence initial={false}>
                  {createOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      className="p-3 pt-2"
                    >
                      {/* mode slider */}
                      <div className="relative inline-flex p-1 rounded-xl border bg-background/60 mb-3">
                        <motion.div
                          className="absolute inset-y-1 rounded-lg bg-indigo-500/10 border border-indigo-500/20"
                          animate={{
                            left: createMode === 'generate' ? 4 : 'calc(50% + 4px)',
                            width: 'calc(50% - 8px)',
                          }}
                          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                        />
                        <button
                          className={cx(
                            'relative z-10 h-8 px-3 text-sm rounded-lg',
                            createMode === 'generate' ? 'text-indigo-600' : 'opacity-80'
                          )}
                          onClick={() => setCreateMode('generate')}
                        >
                          <span className="inline-flex items-center gap-1">
                            <Sparkles className="size-4" /> Generate
                          </span>
                        </button>
                        <button
                          className={cx(
                            'relative z-10 h-8 px-3 text-sm rounded-lg',
                            createMode === 'manual' ? 'text-indigo-600' : 'opacity-80'
                          )}
                          onClick={() => setCreateMode('manual')}
                        >
                          <span className="inline-flex items-center gap-1">
                            <Plus className="size-4" />
                          Manual</span>
                        </button>
                      </div>

                      {/* only ONE panel at a time */}
                      {createMode === 'generate' ? (
                        <div className="relative rounded-xl border p-3">
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
                              {genBusy ? (
                                <span className="inline-flex items-center gap-2">
                                  <Spinner /> Generating…
                                </span>
                              ) : (
                                'Generate'
                              )}
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="relative rounded-xl border p-3">
                          <TopStripeLoader show={creating} />
                          <ShimmerOverlay show={creating} />
                          <div className="text-sm font-medium mb-2">Create manually</div>
                          <Input
                            placeholder="Title"
                            value={newTitle}
                            onChange={(e) => setNewTitle(e.target.value)}
                            disabled={creating}
                          />
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
                              rows={5}
                              placeholder="Paste structured JSON or free text."
                              value={newContent}
                              onChange={(e) => setNewContent(e.target.value)}
                              disabled={creating}
                            />
                          </div>
                          <div className="mt-3 flex justify-end">
                            <Button onClick={createManualContext} disabled={creating || !newTitle.trim() || !newContent.trim()}>
                              {creating ? (
                                <span className="inline-flex items-center gap-2">
                                  <Spinner /> Creating…
                                </span>
                              ) : (
                                'Create Context'
                              )}
                            </Button>
                          </div>
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>

          {/* list */}
          <div className="h-[calc(100dvh-320px)] overflow-y-auto p-3">
            {isLoading ? (
              <ul className="space-y-2">
                {Array.from({ length: 6 }).map((_, i) => (
                  <li key={i} className="relative rounded-2xl border p-3 bg-background/60 overflow-hidden">
                    <ShimmerOverlay show />
                    <div className="h-4 w-48 bg-foreground/10 rounded mb-2" />
                    <div className="h-3 w-80 bg-foreground/10 rounded mb-1.5" />
                    <div className="h-3 w-64 bg-foreground/10 rounded" />
                  </li>
                ))}
              </ul>
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
                    <li key={c.id} className="cursor-pointer">
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

          {/* footer */}
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

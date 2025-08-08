'use client';

import * as React from 'react';
import { useMemo, useState } from 'react';
import useSWR from 'swr';
import { motion, AnimatePresence } from 'framer-motion';
import cx from 'classnames';
import { fetcher } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { LibraryBig, Search, Hash, Download, Play, Upload, X, Trash2, Star } from 'lucide-react';
import { toast } from '@/components/toast';

type ContextRow = {
  id: string;
  name: string;
  content: string;         // JSON string
  tags: string[];
  description: string;
  createdBy: string;
  createdAt: string;
  publicId?: string;       // present when fetched from /api/public-contexts
  publisherId?: string;
  publishedAt?: string;
  owner?: boolean;
};

export function PublicContextLibrary({
  open,
  onClose,
  onUse,           // (ctx: ContextRow) => void    — immediately use the context
  onImported,      // (ctx: ContextRow) => void    — called after save/import succeeds
}: {
  open: boolean;
  onClose: () => void;
  onUse: (ctx: ContextRow) => void;
  onImported?: (ctx: ContextRow) => void;
}) {
  const { data, isLoading, mutate } = useSWR<{ contexts: ContextRow[] }>(
    open ? '/api/public-contexts' : null,
    fetcher
  );

  const [query, setQuery] = useState('');
  const [tag, setTag] = useState('');

  const contexts = data?.contexts ?? [];
  const allTags = useMemo(
    () => Array.from(new Set(contexts.flatMap(c => c.tags))).sort(),
    [contexts]
  );

  const filtered = useMemo(() => {
    let items = contexts;
    if (query) {
      const q = query.toLowerCase();
      items = items.filter(c =>
        (c.name + ' ' + c.description).toLowerCase().includes(q)
      );
    }
    if (tag) {
      const t = tag.toLowerCase();
      items = items.filter(c => c.tags.map(x => x.toLowerCase()).includes(t));
    }
    return items;
  }, [contexts, query, tag]);

  async function handleSave(publicId: string) {
    try {
      const res = await fetch('/api/contexts/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ publicId }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.message || 'Failed to save');
      }
      const j = await res.json();
      onImported?.(j.context);
      toast({ type: 'success', description: 'Saved to your library.' });
    } catch (e: any) {
      toast({ type: 'error', description: e?.message || 'Failed to save' });
    }
  }

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
            'border-l bg-background/80 backdrop-blur-md'
          )}
          role="dialog"
          aria-label="Public Context Library"
        >
          {/* Soft gradients */}
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute -right-28 -top-28 size-60 rounded-full bg-fuchsia-500/10 blur-3xl" />
            <div className="absolute -left-24 -bottom-24 size-60 rounded-full bg-indigo-500/10 blur-3xl" />
          </div>

          {/* Header */}
          <div className="sticky top-0 z-10 border-b bg-gradient-to-r from-indigo-500/[0.06] via-fuchsia-500/[0.06] to-pink-500/[0.06]">
            <div className="flex items-center justify-between px-3 py-2">
              <div className="flex items-center gap-2">
                <div className="grid place-items-center rounded-lg border bg-background/80 p-1.5 text-indigo-600 border-indigo-500/30">
                  <LibraryBig className="size-4" />
                </div>
                <div className="font-medium">Public Library</div>
                <div className="text-xs opacity-70 ml-2 tabular-nums">
                  {isLoading ? '…' : filtered.length} results
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close">
                <X className="size-4" />
              </Button>
            </div>

            {/* Search & Tag */}
            <div className="px-3 pb-3 space-y-2">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 size-4 opacity-60" />
                <Input
                  className="pl-8"
                  placeholder="Search public contexts…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-2">
                <Hash className="size-4 opacity-70" />
                <div className="flex flex-wrap gap-1.5">
                  <Badge
                    variant={tag === '' ? 'default' : 'outline'}
                    className="text-[10px] cursor-pointer"
                    onClick={() => setTag('')}
                  >
                    all
                  </Badge>
                  {allTags.map((t) => (
                    <Badge
                      key={t}
                      variant={tag === t ? 'default' : 'outline'}
                      className="text-[10px] cursor-pointer"
                      onClick={() => setTag(tag === t ? '' : t)}
                    >
                      #{t}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* List */}
          <div className="h-[calc(100dvh-168px)] overflow-y-auto p-3">
            {isLoading ? (
              <div className="p-3 text-sm opacity-70">Loading…</div>
            ) : filtered.length === 0 ? (
              <div className="p-3 text-sm opacity-70">No public contexts found.</div>
            ) : (
              <ul className="space-y-2">
                {filtered.map((c) => (
                  <li key={c.id}>
                    <div className={cx(
                      'rounded-2xl border bg-background/70 backdrop-blur p-3 transition',
                      'hover:bg-background/90 border-foreground/10'
                    )}>
                      <div className="flex items-start gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="font-medium truncate">{c.name}</div>
                          {c.description && (
                            <div className="text-xs opacity-75 mt-0.5 line-clamp-2">{c.description}</div>
                          )}
                          {c.tags?.length > 0 && (
                            <div className="mt-1.5 flex flex-wrap gap-1.5">
                              {c.tags.slice(0, 10).map((t) => (
                                <Badge key={t} variant="outline" className="text-[10px]">#{t}</Badge>
                              ))}
                              {c.tags.length > 10 && (
                                <Badge variant="outline" className="text-[10px] opacity-70">+{c.tags.length - 10}</Badge>
                              )}
                            </div>
                          )}
                        </div>

                        <div className="flex flex-col gap-1 shrink-0">
                          {/* Use now */}
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button size="icon" variant="ghost" onClick={() => onUse(c)}>
                                <Play className="size-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Use now</TooltipContent>
                          </Tooltip>

                          {/* Save to my library */}
                          {c.publicId && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => handleSave(c.publicId!)}
                                >
                                  <Download className="size-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Save to my library</TooltipContent>
                            </Tooltip>
                          )}
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Footer */}
          <div className="sticky bottom-0 border-t bg-background/70 backdrop-blur px-3 py-2">
            <div className="flex items-center justify-end gap-2">
              <Button variant="ghost" onClick={onClose}>Close</Button>
            </div>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}

'use client';

import { DefaultChatTransport } from 'ai';
import { useChat } from '@ai-sdk/react';
import { useEffect, useMemo, useRef, useState } from 'react';
import useSWR, { useSWRConfig } from 'swr';
import { ChatHeader } from '@/components/chat-header';
import type { Vote } from '@/lib/db/schema';
import { fetcher, fetchWithErrorHandlers, generateUUID } from '@/lib/utils';
import { Artifact } from './artifact';
import { MultimodalInput } from './multimodal-input';
import { Messages } from './messages';
import type { VisibilityType } from './visibility-selector';
import { useArtifactSelector } from '@/hooks/use-artifact';
import { unstable_serialize } from 'swr/infinite';
import { getChatHistoryPaginationKey } from './sidebar-history';
import { toast } from './toast';
import type { Session } from 'next-auth';
import { useSearchParams } from 'next/navigation';
import { useChatVisibility } from '@/hooks/use-chat-visibility';
import { useAutoResume } from '@/hooks/use-auto-resume';
import { ChatSDKError } from '@/lib/errors';
import type { Attachment, ChatMessage } from '@/lib/types';
import { useDataStream } from './data-stream-provider';

import { AnimatePresence, motion } from 'framer-motion';
import {
  BookMarked,
  Hash,
  LibraryBig,
  Plus,
  Sparkles,
  X,
  Search,
  CheckCircle2,
  Tag as TagIcon,
} from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';
import cx from 'classnames';

/* ----------------------------- Types ----------------------------- */

type ContextRow = {
  id: string;
  name: string;
  content: string; // JSON string (per your generate route)
  tags: string[];
  description: string | null;
  createdBy: string;
  createdAt: string;
};

/** Matches your structured JSON we store in `content` */
type StructuredContext = {
  title: string;
  description: string;
  background_goals: string[];
  tone_style: string[];
  constraints_scope: string[];
  example_prompts: string[];
};

/* --------------------------- Utilities --------------------------- */

// Strip "**Title:**"/heading markers for nicer display/logging
function cleanTitle(s: string) {
  return s.replace(/^\s*(?:\*\*Title\*\*|#+)\s*/i, '').trim();
}

function parseStructured(content: string): StructuredContext | null {
  try {
    const obj = JSON.parse(content);
    if (
      obj &&
      typeof obj === 'object' &&
      typeof obj.title === 'string' &&
      typeof obj.description === 'string' &&
      Array.isArray(obj.background_goals)
    ) {
      return obj as StructuredContext;
    }
  } catch {
    // non-JSON legacy content, ignore
  }
  return null;
}

function unique<T>(arr: T[]): T[] {
  return Array.from(new Set(arr));
}

/* --------------------------- TagInput ---------------------------- */
/** A small inline chip input component: Enter/Comma to add, click (x) to remove */
function TagInput({
  value,
  onChange,
  placeholder = 'add a tag and press Enter',
  disabled = false,
}: {
  value: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
}) {
  const [draft, setDraft] = useState('');

  function commit(token: string) {
    const t = token.trim().toLowerCase();
    if (!t) return;
    if (value.includes(t)) return;
    onChange([...value, t]);
  }

  return (
    <div className="w-full rounded-xl border px-2 py-1.5">
      <div className="flex flex-wrap gap-1">
        {value.map((t) => (
          <Badge key={t} variant="outline" className="text-[10px] gap-1">
            <TagIcon className="size-3 opacity-70" />
            {t}
            <button
              type="button"
              className="ml-1 opacity-60 hover:opacity-100"
              onClick={() => onChange(value.filter((x) => x !== t))}
              aria-label={`Remove ${t}`}
              disabled={disabled}
            >
              <X className="size-3" />
            </button>
          </Badge>
        ))}
        <input
          className="flex-1 min-w-[120px] bg-transparent outline-none text-sm px-1 py-0.5"
          placeholder={placeholder}
          value={draft}
          disabled={disabled}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ',') {
              e.preventDefault();
              commit(draft);
              setDraft('');
            } else if (e.key === 'Backspace' && !draft && value.length) {
              // quick remove last
              onChange(value.slice(0, -1));
            }
          }}
          onBlur={() => {
            if (draft.trim()) {
              commit(draft);
              setDraft('');
            }
          }}
        />
      </div>
    </div>
  );
}

/* ----------------------------- Main ------------------------------ */

export function Chat({
  id,
  initialMessages,
  initialChatModel,
  initialVisibilityType,
  isReadonly,
  session,
  autoResume,
}: {
  id: string;
  initialMessages: ChatMessage[];
  initialChatModel: string;
  initialVisibilityType: VisibilityType;
  isReadonly: boolean;
  session: Session;
  autoResume: boolean;
}) {
  const { visibilityType } = useChatVisibility({ chatId: id, initialVisibilityType });
  const { mutate } = useSWRConfig();
  const { setDataStream } = useDataStream();

  const [input, setInput] = useState<string>('');

  // Dock open/close
  const [contextDockOpen, setContextDockOpen] = useState(false);

  // Single-select state + synced ref for send
  const [selectedContextId, _setSelectedContextId] = useState<string | null>(null);
  const selectedContextIdRef = useRef<string | null>(null);
  function setSelectedContextIdSafe(next: string | null) {
    selectedContextIdRef.current = next;
    _setSelectedContextId(next);
  }

  // Load contexts
  const { data: contextsData, isLoading: contextsLoading, mutate: reloadContexts } = useSWR<{
    contexts: ContextRow[];
  }>(`/api/contexts?mine=true`, fetcher);

  // Filters
  const [query, setQuery] = useState('');
  const [tagFilter, setTagFilter] = useState<string>('');

  const allTags = useMemo(
    () => unique((contextsData?.contexts ?? []).flatMap((c) => c.tags)).sort(),
    [contextsData],
  );

  const contexts = useMemo(() => {
    const items = contextsData?.contexts ?? [];
    let res = items;

    if (query) {
      const q = query.toLowerCase();
      res = res.filter((c) => {
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

    if (tagFilter) {
      const t = tagFilter.toLowerCase();
      res = res.filter((c) => c.tags.map((x) => x.toLowerCase()).includes(t));
    }

    return res;
  }, [contextsData, query, tagFilter]);

  // Quick Generate state (now with chip tags)
  const [genPrompt, setGenPrompt] = useState('');
  const [genTags, setGenTags] = useState<string[]>([]);
  const [genBusy, setGenBusy] = useState(false);

  async function handleQuickGenerate() {
    if (!genPrompt.trim()) return;
    setGenBusy(true);
    try {
      const res = await fetch('/api/contexts/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userPrompt: genPrompt,
          tags: genTags,
          model: 'chat-model',
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.message || 'Failed to generate');
      }
      await reloadContexts();
      setGenPrompt('');
      setGenTags([]);
      toast({ type: 'success', description: 'Context generated!' });
    } catch (e: any) {
      toast({ type: 'error', description: e?.message || 'Failed to generate context' });
    } finally {
      setGenBusy(false);
    }
  }

  // Chat hook — ensure we pass the latest selected context id
  const {
    messages,
    setMessages,
    sendMessage,
    status,
    stop,
    regenerate,
    resumeStream,
  } = useChat<ChatMessage>({
    id,
    messages: initialMessages,
    experimental_throttle: 100,
    generateId: generateUUID,
    transport: new DefaultChatTransport({
      api: '/api/chat',
      fetch: fetchWithErrorHandlers,
      prepareSendMessagesRequest: ({ messages, id, body }) => {
        const currentId = selectedContextIdRef.current;
        const selected = currentId ? (contexts.find((c) => c.id === currentId) || null) : null;
        const contextIds = selected ? [selected.id] : [];

        console.log('[CTX → /api/chat] applying contexts', {
          chatId: id,
          count: contextIds.length,
          contextIds,
          titles: selected ? [cleanTitle(selected.name)] : [],
          structured: Boolean(selected && parseStructured(selected.content)),
        });

        return {
          body: {
            id,
            message: messages.at(-1),
            selectedChatModel: initialChatModel,
            selectedVisibilityType: visibilityType,
            contextIds,
            ...body,
          },
        };
      },
    }),
    onData: (dataPart) => setDataStream((ds) => (ds ? [...ds, dataPart] : [])),
    onFinish: () => mutate(unstable_serialize(getChatHistoryPaginationKey)),
    onError: (error) => {
      if (error instanceof ChatSDKError) {
        toast({ type: 'error', description: error.message });
      }
    },
  });

  // initial query passthrough
  const searchParams = useSearchParams();
  const urlQuery = searchParams.get('query');
  const [hasAppendedQuery, setHasAppendedQuery] = useState(false);
  useEffect(() => {
    if (urlQuery && !hasAppendedQuery) {
      sendMessage({
        role: 'user' as const,
        parts: [{ type: 'text', text: urlQuery }],
      });
      setHasAppendedQuery(true);
      window.history.replaceState({}, '', `/chat/${id}`);
    }
  }, [urlQuery, sendMessage, hasAppendedQuery, id]);

  const { data: votes } = useSWR<Array<Vote>>(
    messages.length >= 2 ? `/api/vote?chatId=${id}` : null,
    fetcher,
  );

  const [attachments, setAttachments] = useState<Array<Attachment>>([]);
  const isArtifactVisible = useArtifactSelector((state) => state.isVisible);

  useAutoResume({ autoResume, initialMessages, resumeStream, setMessages });

  /* --------------------- Selected Context Pill -------------------- */
const LumachorMark = () => (
  <svg
    viewBox="0 0 32 32"
    aria-hidden="true"
    className="size-6 md:size-7"
  >
    <defs>
      <linearGradient id="lcg" x1="0" x2="1" y1="0" y2="1">
        <stop offset="0%" stopOpacity="1" />
        <stop offset="100%" stopOpacity="1" />
      </linearGradient>
    </defs>
    <rect rx="8" ry="8" x="2" y="2" width="28" height="28" fill="currentColor" opacity="0.12" />
    <path
      d="M8 18c0-4.418 3.582-8 8-8 2.8 0 5.26 1.46 6.67 3.66.2.3.06.7-.26.86l-2.22 1.1a.66.66 0 0 1-.84-.23A5.33 5.33 0 0 0 16 13.33c-2.95 0-5.33 2.38-5.33 5.34V22c0 .37-.3.67-.67.67H8.67A.67.67 0 0 1 8 22v-4Z"
      fill="currentColor"
      opacity="0.8"
    />
    <circle cx="22.5" cy="21" r="2.5" fill="currentColor" />
  </svg>
);

const SelectedContextBar = () => (
  <AnimatePresence>
    {selectedContextId && (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 8 }}
        className="mx-auto mt-2 mb-1 md:my-0 px-4 w-full md:max-w-3xl"
      >
        {(() => {
          const c = contexts.find((x) => x.id === selectedContextId);
          if (!c) return null;
          const structured = parseStructured(c.content);
          const title = cleanTitle(structured?.title || c.name);
          const desc = structured?.description || c.description || '';
          const tags = c.tags || [];

          return (
            <div
              className={cx(
                'relative overflow-hidden rounded-2xl border px-3.5 py-3 md:px-4 md:py-3.5',
                'bg-gradient-to-r from-indigo-500/[0.06] via-fuchsia-500/[0.06] to-pink-500/[0.06]',
                'border-indigo-500/20'
              )}
            >
              {/* Subtle glow */}
              <div className="pointer-events-none absolute -right-20 -top-20 size-40 rounded-full bg-fuchsia-500/10 blur-3xl" />
              <div className="pointer-events-none absolute -left-16 -bottom-16 size-40 rounded-full bg-indigo-500/10 blur-3xl" />

              <div className="flex items-start gap-3">
                {/* Logo + rail */}
                <div className="relative shrink-0">
                  <div className="grid place-items-center rounded-xl border bg-background/60 backdrop-blur-sm p-1.5 md:p-2 text-indigo-600 border-indigo-500/30">
                    <LumachorMark />
                  </div>
                </div>

                {/* Text block */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-start gap-2">
                    <div className="min-w-0">
                      <div className="font-medium leading-tight truncate">
                        {title}
                      </div>
                      {desc ? (
                        <div className="text-xs opacity-80 mt-0.5 line-clamp-2">
                          {desc}
                        </div>
                      ) : null}
                    </div>

                    {/* Actions */}
                    <div className="ml-auto flex items-center gap-1 shrink-0">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2"
                            onClick={() => setContextDockOpen(true)}
                          >
                            <LibraryBig className="size-4 mr-1" />
                            Change
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Change context</TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="size-7"
                            onClick={() => setSelectedContextIdSafe(null)}
                            aria-label="Clear context"
                          >
                            <X className="size-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Clear</TooltipContent>
                      </Tooltip>
                    </div>
                  </div>

                  {/* Tags */}
                  {tags.length > 0 ? (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {tags.slice(0, 6).map((t) => (
                        <Badge
                          key={t}
                          variant="outline"
                          className="text-[10px] border-indigo-500/30"
                        >
                          #{t}
                        </Badge>
                      ))}
                      {tags.length > 6 ? (
                        <Badge variant="outline" className="text-[10px] opacity-70">
                          +{tags.length - 6} more
                        </Badge>
                      ) : null}
                    </div>
                  ) : null}

                  {/* Optional: quick glance goals if structured */}
                  {structured?.background_goals?.length ? (
                    <div className="mt-2 text-[11px] opacity-80">
                      <span className="font-medium">Goals:</span>{' '}
                      {structured.background_goals.slice(0, 3).join(' • ')}
                      {structured.background_goals.length > 3 ? '…' : ''}
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          );
        })()}
      </motion.div>
    )}
  </AnimatePresence>
);

  /* ----------------------------- UI ------------------------------ */

  return (
    <>
      <div className="flex flex-col min-w-0 h-dvh bg-background">
        <ChatHeader
          chatId={id}
          selectedModelId={initialChatModel}
          selectedVisibilityType={initialVisibilityType}
          isReadonly={isReadonly}
          session={session}
          onOpenContexts={() => setContextDockOpen(true)}
          selectedCount={selectedContextId ? 1 : 0}
        />

        <SelectedContextBar />

        <Messages
          chatId={id}
          status={status}
          votes={votes}
          messages={messages}
          setMessages={setMessages}
          regenerate={regenerate}
          isReadonly={isReadonly}
          isArtifactVisible={isArtifactVisible}
        />

        <form className="flex mx-auto px-4 bg-background pb-4 md:pb-6 gap-2 w-full md:max-w-3xl">
          {!isReadonly && (
            <MultimodalInput
              chatId={id}
              input={input}
              setInput={setInput}
              status={status}
              stop={stop}
              attachments={attachments}
              setAttachments={setAttachments}
              messages={messages}
              setMessages={setMessages}
              sendMessage={sendMessage}
              selectedVisibilityType={visibilityType}
            />
          )}
        </form>

        {/* Floating button (mobile) */}
        <AnimatePresence>
          {!isReadonly && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 6 }}
              className="fixed bottom-20 right-4 z-40 md:hidden"
            >
              <Button
                size="lg"
                className="rounded-full shadow-md"
                onClick={() => setContextDockOpen(true)}
              >
                <LibraryBig className="mr-2 size-5" />
                Context
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Context Library Dock (single-select) */}
      <AnimatePresence>
        {contextDockOpen && (
          <motion.aside
            initial={{ x: 360, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 360, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 26 }}
            className="fixed top-0 right-0 h-dvh w-full max-w-[380px] z-50 border-l bg-background"
            role="dialog"
            aria-label="Context Library"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-3 py-2 border-b">
              <div className="flex items-center gap-2">
                <LibraryBig className="size-5" />
                <span className="font-medium">Context Library</span>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setContextDockOpen(false)}>
                <X className="size-4" />
              </Button>
            </div>

            {/* Quick Generate */}
            <div className="p-3 border-b space-y-2">
              <div className="flex items-center gap-2">
                <Sparkles className="size-4" />
                <span className="text-sm opacity-80">Quick Generate</span>
              </div>
              <Input
                placeholder="What should this assistant specialize in? (e.g., 'Explain calculus step-by-step…')"
                value={genPrompt}
                onChange={(e) => setGenPrompt(e.target.value)}
              />
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs opacity-70">
                  <TagIcon className="size-3" />
                  Add tags
                </div>
                <TagInput value={genTags} onChange={setGenTags} />
              </div>
              <div className="flex items-center justify-end">
                <Button onClick={handleQuickGenerate} disabled={genBusy}>
                  <Plus className="size-4 mr-1" />
                  {genBusy ? 'Generating…' : 'Generate'}
                </Button>
              </div>
            </div>

            {/* Filters */}
            <div className="p-3 border-b space-y-2">
              <div className="flex items-center gap-2">
                <Search className="size-4 opacity-70" />
                <Input
                  placeholder="Search by title/description/goals…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Hash className="size-4 opacity-70" />
                  <span className="text-sm opacity-80">Filter by tag</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  <Badge
                    variant={tagFilter === '' ? 'default' : 'outline'}
                    className="text-[10px] cursor-pointer"
                    onClick={() => setTagFilter('')}
                  >
                    all
                  </Badge>
                  {allTags.map((t) => (
                    <Badge
                      key={t}
                      variant={tagFilter === t ? 'default' : 'outline'}
                      className="text-[10px] cursor-pointer"
                      onClick={() => setTagFilter(tagFilter === t ? '' : t)}
                    >
                      #{t}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>

            {/* List (single-select) */}
            <div className="h-[calc(100dvh-260px)] overflow-y-auto">
              {contextsLoading ? (
                <div className="p-3 text-sm opacity-70">Loading contexts…</div>
              ) : contexts.length === 0 ? (
                <div className="p-3 text-sm opacity-70">No contexts yet. Try generating one above.</div>
              ) : (
                <ul className="p-2 space-y-2">
                  {contexts.map((c) => {
                    const active = selectedContextId === c.id;
                    const structured = parseStructured(c.content);
                    return (
                      <li key={c.id}>
                        <button
                          className={cx(
                            'w-full text-left rounded-xl border px-3 py-2 transition',
                            active ? 'bg-muted border-foreground/20' : 'hover:bg-muted/50',
                          )}
                          onClick={() => setSelectedContextIdSafe(active ? null : c.id)}
                          aria-pressed={active}
                        >
                          <div className="flex items-start gap-2">
                            <div
                              className={cx(
                                'mt-[3px] rounded-full border size-4 shrink-0 grid place-items-center',
                                active ? 'bg-foreground text-background' : 'opacity-60',
                              )}
                            >
                              {active && <CheckCircle2 className="size-3" />}
                            </div>
                            <div className="min-w-0">
                              <div className="font-medium truncate">
                                {cleanTitle(structured?.title || c.name)}
                              </div>

                              {structured?.description ? (
                                <div className="text-xs opacity-70 line-clamp-2 mt-0.5">
                                  {structured.description}
                                </div>
                              ) : c.description ? (
                                <div className="text-xs opacity-70 line-clamp-2 mt-0.5">
                                  {c.description}
                                </div>
                              ) : null}

                              {structured?.background_goals?.length ? (
                                <div className="mt-1 text-[11px] opacity-80 line-clamp-3">
                                  <span className="font-medium">Goals:</span>{' '}
                                  {structured.background_goals.slice(0, 3).join(' \n• ')}
                                  {structured.background_goals.length > 3 ? '…' : ''}
                                </div>
                              ) : null}

                              <div className="mt-1 flex gap-1 flex-wrap">
                                {c.tags.map((t) => (
                                  <Badge key={t} variant="outline" className="text-[10px]">
                                    #{t}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          </div>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            {/* Footer */}
            <div className="p-3 border-t flex items-center gap-2">
              <Button
                variant="secondary"
                onClick={() => setContextDockOpen(false)}
                className="flex-1"
                disabled={!selectedContextId}
              >
                {selectedContextId ? 'Use selected' : 'Choose a context'}
              </Button>
              {selectedContextId && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" onClick={() => setSelectedContextIdSafe(null)}>
                      <X className="size-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Clear</TooltipContent>
                </Tooltip>
              )}
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      <Artifact
        chatId={id}
        input={input}
        setInput={setInput}
        status={status}
        stop={stop}
        attachments={attachments}
        setAttachments={setAttachments}
        sendMessage={sendMessage}
        messages={messages}
        setMessages={setMessages}
        regenerate={regenerate}
        votes={undefined}
        isReadonly={isReadonly}
        selectedVisibilityType={visibilityType}
      />
    </>
  );
}

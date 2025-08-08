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
} from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';
import cx from 'classnames';

type ContextRow = {
  id: string;
  name: string;
  content: string;
  tags: string[];
  description: string | null;
  createdBy: string;
  createdAt: string;
};

// Strip "**Title:**"/heading markers for nicer display/logging
function cleanTitle(s: string) {
  return s.replace(/^\s*(?:\*\*Title\*\*|#+)\s*/i, '').trim();
}

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

  // ────────────────────────────────────────────────────────────
  // Context UI state
  // ────────────────────────────────────────────────────────────
  const [contextDockOpen, setContextDockOpen] = useState(false);

  // SINGLE-SELECTION now (per your request: “just pass the id of the selected one”)
  const [selectedContextId, setSelectedContextId] = useState<string | null>(null);

  // keep a ref in sync so prepareSendMessagesRequest always sees the latest value
  const selectedContextIdRef = useRef<string | null>(null);
  useEffect(() => {
    selectedContextIdRef.current = selectedContextId;
  }, [selectedContextId]);

  const { data: contextsData, isLoading: contextsLoading, mutate: reloadContexts } = useSWR<{
    contexts: ContextRow[];
  }>(`/api/contexts?mine=true`, fetcher);

  // Filters
  const [query, setQuery] = useState('');
  const [tagFilter, setTagFilter] = useState('');
  const contexts = useMemo(() => {
    const items = contextsData?.contexts ?? [];
    let res = items;
    if (query) {
      const q = query.toLowerCase();
      res = res.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          (c.description?.toLowerCase().includes(q) ?? false),
      );
    }
    if (tagFilter) {
      const t = tagFilter.toLowerCase();
      res = res.filter((c) => c.tags.map((x) => x.toLowerCase()).includes(t));
    }
    return res;
  }, [contextsData, query, tagFilter]);

  // Quick generate
  const [genPrompt, setGenPrompt] = useState('');
  const [genTags, setGenTags] = useState<string>('');
  const [genBusy, setGenBusy] = useState(false);
  const handleQuickGenerate = async () => {
    if (!genPrompt.trim()) return;
    setGenBusy(true);
    try {
      const res = await fetch('/api/contexts/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userPrompt: genPrompt,
          tags: genTags
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean),
          model: 'chat-model',
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.message || 'Failed to generate');
      }
      await reloadContexts();
      setGenPrompt('');
      setGenTags('');
      toast({ type: 'success', description: 'Context generated!' });
    } catch (e: any) {
      toast({ type: 'error', description: e?.message || 'Failed to generate context' });
    } finally {
      setGenBusy(false);
    }
  };

  // ────────────────────────────────────────────────────────────
  // useChat — IMPORTANT: use ref value inside prepareSendMessagesRequest
  // ────────────────────────────────────────────────────────────
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
        const selected = selectedContextIdRef.current
          ? contexts.find((c) => c.id === selectedContextIdRef.current) || null
          : null;

        const contextIds = selected ? [selected.id] : [];

        // Client-side confirmation log (so you’ll SEE the id before the request leaves)
        console.log('[CTX → /api/chat] applying contexts', {
          chatId: id,
          count: contextIds.length,
          contextIds,
          titles: selected ? [cleanTitle(selected.name)] : [],
        });

        return {
          body: {
            id,
            message: messages.at(-1),
            selectedChatModel: initialChatModel,
            selectedVisibilityType: visibilityType,
            contextIds, // ← always read from ref (latest) and pass array of 0/1 ids
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

  // Selected context pill
  const SelectedContextBar = () => (
    <AnimatePresence>
      {selectedContextId && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 8 }}
          className="mx-auto mt-2 mb-1 md:my-0 px-4 w-full md:max-w-3xl"
        >
          <div className="flex items-center gap-2 flex-wrap rounded-xl border bg-muted/50 px-3 py-2">
            <BookMarked className="size-4 opacity-70" />
            <span className="text-xs opacity-70">Context:</span>
            {(() => {
              const c = contexts.find((x) => x.id === selectedContextId);
              if (!c) return null;
              return (
                <Badge variant="secondary" className="gap-1">
                  {cleanTitle(c.name)}
                  <button
                    className="ml-1 opacity-60 hover:opacity-100"
                    onClick={() => setSelectedContextId(null)}
                    aria-label="Remove context"
                  >
                    <X className="size-3" />
                  </button>
                </Badge>
              );
            })()}
            <div className="ml-auto">
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
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );

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
            className="fixed top-0 right-0 h-dvh w-full max-w-[360px] z-50 border-l bg-background"
            role="dialog"
            aria-label="Context Library"
          >
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
            <div className="p-3 border-b">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="size-4" />
                <span className="text-sm opacity-80">Quick Generate</span>
              </div>
              <div className="space-y-2">
                <Input
                  placeholder="I need a calculus tutor that explains derivatives…"
                  value={genPrompt}
                  onChange={(e) => setGenPrompt(e.target.value)}
                />
                <div className="flex items-center gap-2">
                  <Input
                    placeholder="tags (comma separated)"
                    value={genTags}
                    onChange={(e) => setGenTags(e.target.value)}
                  />
                  <Button onClick={handleQuickGenerate} disabled={genBusy}>
                    <Plus className="size-4 mr-1" />
                    {genBusy ? 'Generating…' : 'Generate'}
                  </Button>
                </div>
              </div>
            </div>

            {/* Filters */}
            <div className="p-3 border-b space-y-2">
              <div className="flex items-center gap-2">
                <Search className="size-4 opacity-70" />
                <Input
                  placeholder="Search my contexts…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-2">
                <Hash className="size-4 opacity-70" />
                <Input
                  placeholder="Filter by tag (e.g. coding)"
                  value={tagFilter}
                  onChange={(e) => setTagFilter(e.target.value)}
                />
              </div>
            </div>

            {/* List (single-select) */}
            <div className="h-[calc(100dvh-224px)] overflow-y-auto">
              {contextsLoading ? (
                <div className="p-3 text-sm opacity-70">Loading contexts…</div>
              ) : contexts.length === 0 ? (
                <div className="p-3 text-sm opacity-70">No contexts yet. Try generating one above.</div>
              ) : (
                <ul className="p-2 space-y-2">
                  {contexts.map((c) => {
                    const active = selectedContextId === c.id;
                    return (
                      <li key={c.id}>
                        <button
                          className={cx(
                            'w-full text-left rounded-xl border px-3 py-2 transition',
                            active ? 'bg-muted border-foreground/20' : 'hover:bg-muted/50',
                          )}
                          onClick={() => setSelectedContextId(active ? null : c.id)}
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
                              <div className="font-medium truncate">{cleanTitle(c.name)}</div>
                              {c.description && (
                                <div className="text-xs opacity-70 line-clamp-2 mt-0.5">
                                  {c.description}
                                </div>
                              )}
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
                    <Button variant="ghost" size="icon" onClick={() => setSelectedContextId(null)}>
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

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

import { ContextSelectedBar, type ContextRow } from './context-selected-bar';
import { ContextLibraryDock } from './context-library-dock'; // ← brought back

/* ----------------------------- Helpers ----------------------------- */

function cleanTitle(s: string) {
  return s.replace(/^\s*(?:\*\*Title\*\*|#+)\s*/i, '').trim();
}
function isStructuredJson(content: string) {
  try {
    const o = JSON.parse(content);
    return !!o && typeof o === 'object' && typeof (o as any).title === 'string';
  } catch {
    return false;
  }
}

/* ------------------------------ Main ------------------------------- */

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

  const [input, setInput] = useState('');
  const [contextDockOpen, setContextDockOpen] = useState(false);

  // Selected context (id in state + ref for transport)
  const [selectedContextId, _setSelectedContextId] = useState<string | null>(null);
  const selectedContextIdRef = useRef<string | null>(null);
  const setSelectedContextIdSafe = (next: string | null) => {
    selectedContextIdRef.current = next;
    _setSelectedContextId(next);
  };

  // Contexts (SWR)
  const { data: contextsData, mutate: reloadContexts } = useSWR<{ contexts: ContextRow[] }>(
    `/api/contexts?mine=true`,
    fetcher,
  );
  const contexts = useMemo(() => contextsData?.contexts ?? [], [contextsData?.contexts]);

  // Chat hook
  const { messages, setMessages, sendMessage, status, stop, regenerate, resumeStream } =
    useChat<ChatMessage>({
      id,
      messages: initialMessages,
      experimental_throttle: 100,
      generateId: generateUUID,
      transport: new DefaultChatTransport({
        api: '/api/chat',
        fetch: fetchWithErrorHandlers,
        prepareSendMessagesRequest: ({ messages, id, body }) => {
          const idFromRef = selectedContextIdRef.current;
          const contextIds = idFromRef ? [idFromRef] : [];

          // pretty logging
          let title: string | undefined;
          let structured = false;
          if (idFromRef) {
            const c = contexts.find((x) => x.id === idFromRef);
            if (c) {
              title = cleanTitle(c.name);
              structured = isStructuredJson(c.content);
            }
          }

          console.log('[CTX → /api/chat] applying contexts', {
            chatId: id,
            count: contextIds.length,
            contextIds,
            titles: title ? [title] : [],
            structured,
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
      onData: (chunk) => setDataStream((ds) => (ds ? [...ds, chunk] : [])),
      onFinish: () => mutate(unstable_serialize(getChatHistoryPaginationKey)),
      onError: (error) => {
        if (error instanceof ChatSDKError) {
          toast({ type: 'error', description: error.message });
        }
      },
    });

  // ?query= just pre-fills the composer (don’t auto-send)
  const searchParams = useSearchParams();
  const urlQuery = searchParams.get('query');
  const [hasAppendedQuery, setHasAppendedQuery] = useState(false);
  useEffect(() => {
    if (urlQuery && !hasAppendedQuery) {
      setInput(urlQuery);
      setHasAppendedQuery(true);
      window.history.replaceState({}, '', `/chat/${id}`);
    }
  }, [urlQuery, hasAppendedQuery, id]);

  // Votes (lazy)
  const { data: votes } = useSWR<Array<Vote>>(
    messages.length >= 2 ? `/api/vote?chatId=${id}` : null,
    fetcher,
  );

  // Attachments / artifact
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const isArtifactVisible = useArtifactSelector((s) => s.isVisible);

  // Auto-resume
  useAutoResume({ autoResume, initialMessages, resumeStream, setMessages });

  // Selected context object (for pill/details)
  const selectedContext = useMemo<ContextRow | null>(
    () => (selectedContextId ? contexts.find((x) => x.id === selectedContextId) ?? null : null),
    [selectedContextId, contexts]
  );

  const handleSelectContext = (row: ContextRow) => {
    setSelectedContextIdSafe(row.id);
    setContextDockOpen(false);
  };

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
          selectedCount={contexts.length}
        />

        <ContextSelectedBar
          context={selectedContext}
          onOpenContexts={() => setContextDockOpen(true)}
          onClear={() => setSelectedContextIdSafe(null)}
          stickyTop="2rem"
        />

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
              /* Hand off just enough for auto-context + pill */
              selectedContext={selectedContext}
              setSelectedContextId={setSelectedContextIdSafe}
              reloadContexts={() => reloadContexts?.()}
              onOpenContexts={() => setContextDockOpen(true)}
            />
          )}
        </form>
      </div>

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

      <ContextLibraryDock
        open={contextDockOpen}
        onClose={() => setContextDockOpen(false)}
        onSelect={handleSelectContext}
        selectedContextId={selectedContextId}
        reloadContexts={reloadContexts}
      />
    </>
  );
}

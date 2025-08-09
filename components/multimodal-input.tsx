'use client';

import type { UIMessage } from 'ai';
import cx from 'classnames';
import {
  useRef,
  useEffect,
  useState,
  useCallback,
  type Dispatch,
  type SetStateAction,
  type ChangeEvent,
  memo,
  useMemo,
} from 'react';
import { toast } from 'sonner';
import { useLocalStorage, useWindowSize } from 'usehooks-ts';

import { ArrowUpIcon, PaperclipIcon, StopIcon } from './icons';
import { PreviewAttachment } from './preview-attachment';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { SuggestedActions } from './suggested-actions';
import equal from 'fast-deep-equal';
import type { UseChatHelpers } from '@ai-sdk/react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowDown, LibraryBig } from 'lucide-react';
import { useScrollToBottom } from '@/hooks/use-scroll-to-bottom';
import type { VisibilityType } from './visibility-selector';
import type { Attachment, ChatMessage } from '@/lib/types';
import type { ContextRow } from './context-selected-bar';

/* ---------- tiny inline toggle ---------- */
function MiniToggle({
  checked,
  onChange,
  ariaLabel,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  ariaLabel?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel || 'Toggle'}
      onClick={() => onChange(!checked)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onChange(!checked);
        }
      }}
      className={cx(
        'relative inline-flex h-6 w-10 items-center rounded-full border transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/60',
        checked ? 'bg-indigo-600/80 border-indigo-600/70' : 'bg-background border-foreground/25',
      )}
    >
      <span
        className={cx(
          'pointer-events-none absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform',
          checked ? 'translate-x-4' : 'translate-x-0',
        )}
      />
    </button>
  );
}

function stripTitle(s: string) {
  return (s || '').replace(/^\s*(?:\*\*Title\*\*|#+)\s*/i, '').trim();
}

/* ---------- micro components for loading visuals ---------- */
function Spinner({ className }: { className?: string }) {
  return (
    <svg
      className={cx('animate-spin', className)}
      viewBox="0 0 24 24"
      width="14"
      height="14"
      aria-hidden="true"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
        fill="none"
      />
      <path
        className="opacity-90"
        fill="currentColor"
        d="M4 12a8 8 0 0 1 8-8v4a4 4 0 0 0-4 4H4z"
      />
    </svg>
  );
}

function GlowHalo({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute -inset-1 rounded-full blur-md"
      style={{
        background:
          'conic-gradient(from 0deg, rgba(99,102,241,.25), rgba(236,72,153,.25), rgba(99,102,241,.25))',
      }}
    />
  );
}

function ProgressStripe({ show, colorClass = 'via-indigo-500' }: { show: boolean; colorClass?: string }) {
  if (!show) return null;
  return (
    <div className="absolute inset-x-0 bottom-[-2px] h-[2px] overflow-hidden rounded-full">
      <motion.span
        className={cx(
          'absolute h-full w-1/3 bg-gradient-to-r from-transparent to-transparent',
          colorClass,
        )}
        animate={{ x: ['-120%', '220%'] }}
        transition={{ duration: 1.2, ease: 'linear', repeat: Infinity }}
      />
    </div>
  );
}


/* ---------- main ---------- */
function PureMultimodalInput({
  chatId,
  input,
  setInput,
  status,
  stop,
  attachments,
  setAttachments,
  messages,
  setMessages,
  sendMessage,
  className,
  selectedVisibilityType,

  /* context hooks */
  selectedContext,
  setSelectedContextId,
  reloadContexts,
  onOpenContexts,
}: {
  chatId: string;
  input: string;
  setInput: Dispatch<SetStateAction<string>>;
  status: UseChatHelpers<ChatMessage>['status'];
  stop: () => void;
  attachments: Array<Attachment>;
  setAttachments: Dispatch<SetStateAction<Array<Attachment>>>;
  messages: Array<UIMessage>;
  setMessages: UseChatHelpers<ChatMessage>['setMessages'];
  sendMessage: UseChatHelpers<ChatMessage>['sendMessage'];
  className?: string;
  selectedVisibilityType: VisibilityType;

  selectedContext: ContextRow | null;
  setSelectedContextId: (id: string | null) => void;
  reloadContexts?: () => Promise<any> | void;
  onOpenContexts: () => void;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { width } = useWindowSize();

  /* height */
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight + 2}px`;
    }
  }, []);
  const adjustHeight = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight + 2}px`;
    }
  };
  const resetHeight = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = '98px';
    }
  };

  /* hydration value */
  const [localStorageInput, setLocalStorageInput] = useLocalStorage('input', '');
  useEffect(() => {
    if (textareaRef.current) {
      const domValue = textareaRef.current.value;
      const finalValue = domValue || localStorageInput || '';
      setInput(finalValue);
      adjustHeight();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => setLocalStorageInput(input), [input, setLocalStorageInput]);

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    adjustHeight();
  };

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadQueue, setUploadQueue] = useState<string[]>([]);

  /* control pill state */
  const [autoContextOnFirst, setAutoContextOnFirst] = useLocalStorage<boolean>('autoCtxFirstMessage', true);
  const [pillBusy, setPillBusy] = useState(false);
  const [pillText, setPillText] = useState<string | null>(null);
  const pillTimer = useRef<number | null>(null);
  const setPill = useCallback((text: string | null, ttlMs = 2200, busy = false) => {
    setPillBusy(busy);
    setPillText(text);
    if (pillTimer.current) window.clearTimeout(pillTimer.current);
    if (text && ttlMs > 0) {
      pillTimer.current = window.setTimeout(() => setPillText(null), ttlMs) as unknown as number;
    }
  }, []);

  /* avoid re-gen loop before SWR settles */
  const [justInstalledContextId, setJustInstalledContextId] = useState<string | null>(null);

  /* cancelable generate */
  const generateAbortRef = useRef<AbortController | null>(null);
  const cancelGenerate = useCallback(() => {
    const ac = generateAbortRef.current;
    if (ac) {
      ac.abort();
      generateAbortRef.current = null;
      setPill('Canceled', 1200, false);
      setPillBusy(false);
    }
  }, [setPill]);

  const ensureContextFromPrompt = useCallback(
    async (userText: string) => {
      if (selectedContext || justInstalledContextId) return selectedContext ?? null;

      try {
        setPill('Generating context…', 0, true);

        const ac = new AbortController();
        generateAbortRef.current = ac;

        const res = await fetch('/api/contexts/generate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          credentials: 'include',
          cache: 'no-store',
          signal: ac.signal,
          body: JSON.stringify({
            userPrompt: userText || 'General assistant for this chat',
            tags: [],
            model: 'chat-model',
          }),
        });

        if (!res.ok) {
          let errBody: any = null;
          try {
            errBody = await res.json();
          } catch {}
          const msg =
            errBody?.message ||
            (res.status === 401 ? 'Please sign in to generate a context.' : 'Failed to generate context');
          toast.error(msg);
          setPill('Context generation failed — you can still chat without one', 3500, false);
          return null;
        }

        const j = await res.json();
        const created: ContextRow | undefined = j?.context;
        if (!created?.id) {
          toast.error('Context created but response missing id');
          setPill('Context created but response missing id', 3500, false);
          return null;
        }

        setSelectedContextId(created.id);
        setJustInstalledContextId(created.id);
        void reloadContexts?.();

        setPill(`Context “${stripTitle(created.name)}” installed — press send to chat`, 2600, false);
        return created;
      } catch (e: any) {
        if (e?.name === 'AbortError') return null;
        console.error('[contexts.generate] client error:', e);
        toast.error(e?.message || 'Failed to generate context');
        setPill('Context generation failed — you can still chat without one', 3500, false);
        return null;
      } finally {
        generateAbortRef.current = null;
        setPillBusy(false);
      }
    },
    [selectedContext, justInstalledContextId, setSelectedContextId, reloadContexts, setPill],
  );

  /* send: DO NOT start chat when generating context on empty thread */
  const submitForm = useCallback(() => {
    if (pillBusy) return; // hard block while generating

    const userMsgCount = (messages || []).filter((m) => m.role === 'user').length;
    const hasContextNow = !!(selectedContext || justInstalledContextId);

    // First "send" on an empty chat: generate context only, do NOT send, do NOT change URL
    if (!hasContextNow && autoContextOnFirst && userMsgCount === 0) {
      void ensureContextFromPrompt(input);
      return;
    }

    // Actually sending now → safe to tag the URL as a chat
    window.history.replaceState({}, '', `/chat/${chatId}`);

    sendMessage({
      role: 'user',
      parts: [
        ...attachments.map((a) => ({
          type: 'file' as const,
          url: a.url,
          name: a.name,
          mediaType: a.contentType,
        })),
        { type: 'text', text: input },
      ],
    });

    setAttachments([]);
    setLocalStorageInput('');
    resetHeight();
    setInput('');

    if (width && width > 768) textareaRef.current?.focus();
  }, [
    pillBusy,
    chatId,
    input,
    messages,
    selectedContext,
    justInstalledContextId,
    autoContextOnFirst,
    ensureContextFromPrompt,
    attachments,
    sendMessage,
    setAttachments,
    setLocalStorageInput,
    setInput,
    width,
  ]);

  /* uploads (unchanged) */
  const uploadFile = async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    try {
      const response = await fetch('/api/files/upload', { method: 'POST', body: formData });
      if (response.ok) {
        const data = await response.json();
        const { url, pathname, contentType } = data;
        return { url, name: pathname, contentType };
      }
      const { error } = await response.json();
      toast.error(error || 'Failed to upload file, please try again!');
    } catch {
      toast.error('Failed to upload file, please try again!');
    }
  };

  const handleFileChange = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(event.target.files || []);
      setUploadQueue(files.map((f) => f.name));
      try {
        const uploaded = await Promise.all(files.map(uploadFile));
        const ok = uploaded.filter(Boolean) as any[];
        setAttachments((cur) => [...cur, ...ok]);
      } finally {
        setUploadQueue([]);
      }
    },
    [setAttachments],
  );

  /* scroll bubble */
  const { isAtBottom, scrollToBottom } = useScrollToBottom();
  useEffect(() => {
    if (status === 'submitted') scrollToBottom();
  }, [status, scrollToBottom]);

  /* pill text */
  const userMsgCount = useMemo(() => (messages || []).filter((m) => m.role === 'user').length, [messages]);
  const computedPillText = useMemo(() => {
    if (pillText) return pillText;
    if (userMsgCount === 0) {
      return autoContextOnFirst ? 'Automatically generate context on first message' : 'Auto context is off';
    }
    const knownTitle = selectedContext?.name ?? '';
    const title = stripTitle(knownTitle);
    if (selectedContext || justInstalledContextId) {
      return status === 'streaming'
        ? (title ? `Using context “${title}”…` : 'Using context…')
        : (title ? `Context “${title}” ready` : 'Context ready');
    }
    return status === 'streaming' ? 'Responding…' : 'No context selected';
  }, [pillText, userMsgCount, autoContextOnFirst, selectedContext, justInstalledContextId, status]);

  const showToggle = userMsgCount === 0;

  type PillState =
  | 'busy'
  | 'auto-on'
  | 'auto-off'
  | 'ready-context'
  | 'ready-no-context'
  | 'streaming-context'
  | 'streaming-no-context';

const pillState: PillState = (() => {
  if (pillBusy) return 'busy';
  if (userMsgCount === 0) return autoContextOnFirst ? 'auto-on' : 'auto-off';
  const hasCtx = !!(selectedContext || justInstalledContextId);
  if (hasCtx) return status === 'streaming' ? 'streaming-context' : 'ready-context';
  return status === 'streaming' ? 'streaming-no-context' : 'ready-no-context';
})();

// wrap = tint + border, dot = gradient seed, stripe = progress color
const stateStyles: Record<PillState, { wrap: string; dot: string; stripe: string; text?: string }> = {
  busy: {
    wrap: 'bg-indigo-600/12 border-indigo-500/35 ring-1 ring-indigo-500/25',
    dot: 'from-indigo-500 to-fuchsia-500',
    stripe: 'via-indigo-500',
    text: 'text-indigo-900 dark:text-indigo-200',
  },
  'auto-on': {
    wrap: 'bg-emerald-500/10 border-emerald-500/30',
    dot: 'from-emerald-500 to-teal-500',
    stripe: 'via-emerald-500',
    text: 'text-emerald-900 dark:text-emerald-200',
  },
  'auto-off': {
    wrap: 'bg-slate-500/10 border-slate-500/30',
    dot: 'from-slate-500 to-gray-500',
    stripe: 'via-slate-500',
    text: 'text-slate-900 dark:text-slate-200',
  },
  'ready-context': {
    wrap: 'bg-violet-500/10 border-violet-500/30',
    dot: 'from-violet-500 to-fuchsia-500',
    stripe: 'via-violet-500',
    text: 'text-violet-900 dark:text-violet-200',
  },
  'streaming-context': {
    wrap: 'bg-fuchsia-500/10 border-fuchsia-500/30',
    dot: 'from-fuchsia-500 to-rose-500',
    stripe: 'via-fuchsia-500',
    text: 'text-fuchsia-900 dark:text-fuchsia-200',
  },
  'ready-no-context': {
    wrap: 'bg-amber-500/10 border-amber-500/30',
    dot: 'from-amber-500 to-yellow-500',
    stripe: 'via-amber-500',
    text: 'text-amber-900 dark:text-amber-200',
  },
  'streaming-no-context': {
    wrap: 'bg-orange-500/10 border-orange-500/30',
    dot: 'from-orange-500 to-red-500',
    stripe: 'via-orange-500',
    text: 'text-orange-900 dark:text-orange-200',
  },
};


  return (
    <div className="relative w-full flex flex-col gap-4">
      {/* scroll bubble */}
      <AnimatePresence>
        {!isAtBottom && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            className="absolute left-1/2 bottom-28 -translate-x-1/2 z-50"
          >
            <Button
              data-testid="scroll-to-bottom-button"
              className="rounded-full"
              size="icon"
              variant="outline"
              onClick={(e) => {
                e.preventDefault();
                scrollToBottom();
              }}
            >
              <ArrowDown />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* suggested actions — HIDE while generating to block bypass */}
      {messages.length === 0 && attachments.length === 0 && uploadQueue.length === 0 && !pillBusy && (
        <SuggestedActions
          sendMessage={sendMessage}
          chatId={chatId}
          selectedVisibilityType={selectedVisibilityType}
        />
      )}

      {/* file input */}
      <input
        type="file"
        className="fixed -top-4 -left-4 size-0.5 opacity-0 pointer-events-none"
        ref={fileInputRef}
        multiple
        onChange={handleFileChange}
        tabIndex={-1}
      />

      {/* attachments preview */}
      {(attachments.length > 0 || uploadQueue.length > 0) && (
        <div data-testid="attachments-preview" className="flex flex-row gap-2 overflow-x-scroll items-end">
          {attachments.map((a) => (
            <PreviewAttachment key={a.url} attachment={a} />
          ))}
          {uploadQueue.map((filename) => (
            <PreviewAttachment key={filename} attachment={{ url: '', name: filename, contentType: '' }} isUploading />
          ))}
        </div>
      )}

      {/* CONTROL PILL — visually distinct */}
      <div className="mx-auto w-full md:max-w-3xl px-0 -mb-1">
      <div
        className={cx(
          'relative flex border items-center gap-2 rounded-full px-3 py-1.5 shadow-sm backdrop-blur supports-[backdrop-filter]:backdrop-blur-md',
          stateStyles[pillState].wrap,
        )}
        aria-busy={pillBusy}
        data-busy={pillBusy ? 'true' : 'false'}
      >
        {/* subtle halo when busy */}
        <GlowHalo show={pillBusy} />

        {/* colored dot (spins when busy) */}
        <span
          className={cx(
            'inline-grid place-items-center size-3 rounded-full bg-gradient-to-r',
            stateStyles[pillState].dot,
          )}
        >
          {pillBusy && <Spinner className="text-white/95" />}
        </span>

        {/* text */}
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span
            key={computedPillText}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            className={cx('truncate text-xs md:text-sm', stateStyles[pillState].text || 'text-foreground')}
          >
            {computedPillText}
          </motion.span>
        </AnimatePresence>

        {/* right-side controls (unchanged) */}
        <div className="ml-auto flex items-center gap-2">
          {showToggle && (
            <>
              <span className="text-[11px] opacity-70 hidden sm:inline">Auto</span>
              <MiniToggle
                checked={autoContextOnFirst}
                onChange={setAutoContextOnFirst}
                ariaLabel="Toggle auto-generate context on first message"
              />
            </>
          )}
          {pillBusy && (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                cancelGenerate();
              }}
              className={cx(
                'text-[11px] px-2 py-1 rounded-full border transition-colors',
                'border-red-500/40 text-red-600/90 hover:bg-red-500/10',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/40',
              )}
              aria-label="Cancel generating context"
            >
              Cancel
            </button>
          )}
          <Button
            type="button"               
            size="sm"
            variant="outline"
            className="h-7 px-3 gap-1 rounded-2xl"
            onClick={onOpenContexts}
            aria-label="Change context"
            disabled={pillBusy}
          >
            <LibraryBig className="size-4" />
            <span className="hidden sm:inline text-xs">Context</span>
          </Button>
        </div>

        {/* stripe also changes color */}
        <ProgressStripe show={pillBusy || status === 'streaming'} colorClass={stateStyles[pillState].stripe} />
      </div>
    </div>

      {/* textarea + controls */}
      <div className="relative">
        {/* shimmer overlay while busy (CLIPPED) */}
        {pillBusy && (
          <motion.div
            aria-hidden
            className="pointer-events-none absolute inset-0 rounded-2xl overflow-hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.15 }}
          >
            <motion.div
              className="absolute inset-y-0 w-1/2 rounded-2xl bg-gradient-to-r from-transparent via-white/10 to-transparent dark:via-white/5"
              initial={{ left: '-55%' }}
              animate={{ left: ['-55%', '105%'] }}
              transition={{ duration: 1.4, ease: 'linear', repeat: Infinity }}
            />
          </motion.div>
        )}

        <Textarea
          data-testid="multimodal-input"
          ref={textareaRef}
          placeholder="Send a message..."
          value={input}
          onChange={handleInput}
          className={cx(
            'min-h-[24px] max-h-[calc(75dvh)] overflow-hidden resize-none rounded-2xl !text-base bg-muted pb-10 dark:border-zinc-700',
            pillBusy && 'opacity-95 cursor-wait',
            className,
          )}
          rows={2}
          autoFocus
          onKeyDown={(event) => {
            if (pillBusy) {
              event.preventDefault(); // block Enter while generating
              return;
            }
            if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
              event.preventDefault();
              if (status !== 'ready') {
                toast.error('Please wait for the model to finish its response!');
              } else {
                submitForm();
              }
            }
          }}
          disabled={pillBusy}
          aria-busy={pillBusy}
        />

        <div className="absolute bottom-0 p-2 w-fit flex flex-row justify-start">
          <AttachmentsButton fileInputRef={fileInputRef} status={status} />
        </div>

        <div className="absolute bottom-0 right-0 p-2 w-fit flex flex-row justify-end">
          {status === 'submitted' ? (
            <StopButton stop={stop} setMessages={setMessages} />
          ) : (
            <SendButton input={input} uploadQueue={uploadQueue} submitForm={submitForm} pillBusy={pillBusy} />
          )}
        </div>
      </div>
    </div>
  );
}

export const MultimodalInput = memo(
  PureMultimodalInput,
  (prev, next) => {
    if (prev.input !== next.input) return false;
    if (prev.status !== next.status) return false;
    if (!equal(prev.attachments, next.attachments)) return false;
    if (prev.selectedVisibilityType !== next.selectedVisibilityType) return false;
    if (prev.selectedContext?.id !== next.selectedContext?.id) return false;
    return true;
  },
);

/* ---- Small buttons ---- */
function PureAttachmentsButton({
  fileInputRef,
  status,
}: {
  fileInputRef: React.MutableRefObject<HTMLInputElement | null>;
  status: UseChatHelpers<ChatMessage>['status'];
}) {
  return (
    <Button
      data-testid="attachments-button"
      className="rounded-md rounded-bl-lg p-[7px] h-fit dark:border-zinc-700 hover:dark:bg-zinc-900 hover:bg-zinc-200"
      onClick={(e) => {
        e.preventDefault();
        fileInputRef.current?.click();
      }}
      disabled={status !== 'ready'}
      variant="ghost"
    >
      <PaperclipIcon size={14} />
    </Button>
  );
}
const AttachmentsButton = memo(PureAttachmentsButton);

function PureStopButton({
  stop,
  setMessages,
}: {
  stop: () => void;
  setMessages: UseChatHelpers<ChatMessage>['setMessages'];
}) {
  return (
    <Button
      data-testid="stop-button"
      className="rounded-full p-1.5 h-fit border dark:border-zinc-600"
      onClick={(e) => {
        e.preventDefault();
        stop();
        setMessages((m) => m);
      }}
    >
      <StopIcon size={14} />
    </Button>
  );
}
const StopButton = memo(PureStopButton);

function PureSendButton({
  submitForm,
  input,
  uploadQueue,
  pillBusy,
}: {
  submitForm: () => void;
  input: string;
  uploadQueue: Array<string>;
  pillBusy: boolean;
}) {
  const disabled = pillBusy || input.length === 0 || uploadQueue.length > 0;
  return (
    <Button
      data-testid="send-button"
      className={cx(
        'rounded-full p-1.5 h-fit border dark:border-zinc-600 relative overflow-hidden',
        disabled && 'cursor-not-allowed',
      )}
      onClick={(e) => {
        e.preventDefault();
        if (!pillBusy) submitForm();
      }}
      disabled={disabled}
      aria-busy={pillBusy}
      aria-live="polite"
    >
      {pillBusy ? (
        <span className="flex items-center gap-1.5 px-1.5">
          <Spinner />
          <span className="text-[11px]">Generating…</span>
        </span>
      ) : (
        <ArrowUpIcon size={14} />
      )}

      {/* top shimmer loader (properly clipped & aligned to top edge) */}
      {pillBusy && (
        <span aria-hidden className="pointer-events-none absolute inset-x-0 -top-px h-[2px]">
          <motion.span
            className="absolute top-0 h-[2px] w-[45%] rounded-full bg-gradient-to-r from-transparent via-fuchsia-500 to-transparent"
            style={{ filter: 'drop-shadow(0 0 6px rgba(217,70,239,.35))' }}
            initial={{ x: '-50%' }}
            animate={{ x: ['-50%', '110%'] }}
            transition={{ duration: 1.1, ease: 'linear', repeat: Infinity }}
          />
        </span>
      )}
    </Button>
  );
}
const SendButton = memo(PureSendButton, (prev, next) => {
  if (prev.uploadQueue.length !== next.uploadQueue.length) return false;
  if (prev.input !== next.input) return false;
  if (prev.pillBusy !== next.pillBusy) return false;
  return true;
});

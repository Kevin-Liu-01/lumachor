'use client';

import * as React from 'react';
import { memo, useMemo, useState, useId, useRef } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { ChevronDown, ChevronUp, LibraryBig, X } from 'lucide-react';
import cx from 'classnames';
import LumachorMark from './lumachormark';

/* ----------------------------- Types ----------------------------- */

export type ContextRow = {
  id: string;
  name: string;
  content: string; // JSON string (your structured payload)
  tags: string[];
  description: string | null;
  createdBy: string;
  createdAt: string;
};

type StructuredContext = {
  title: string;
  description: string;
  background_goals: string[];
  tone_style?: string[];
  constraints_scope?: string[];
  example_prompts?: string[];
};

type Props = {
  context: ContextRow | null;
  onOpenContexts: () => void;
  onClear: () => void;
  stickyTop?: string;
  disableMobile?: boolean;
  disableDesktop?: boolean;
};

/* --------------------------- Utilities --------------------------- */

function cleanTitle(s: string) {
  return s.replace(/^\s*(?:\*\*Title\*\*|#+)\s*/i, '').trim();
}

function parseStructured(content: string): StructuredContext | null {
  try {
    const obj = JSON.parse(content);
    if (
      obj &&
      typeof obj === 'object' &&
      typeof (obj as any).title === 'string' &&
      typeof (obj as any).description === 'string'
    ) {
      return obj as StructuredContext;
    }
  } catch {}
  return null;
}

function normalizeGoals(goals: unknown): string[] {
  if (Array.isArray(goals)) return goals.map((g) => String(g)).filter(Boolean);
  if (typeof goals === 'string') {
    return goals
      .split(/\n|•|-|\*/g)
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [];
}

/* --------------------------- Helpers --------------------------- */

function DescriptionClamp({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="group font-light relative">
      <p className={cx('text-xs md:text-sm leading-relaxed opacity-90', open ? '' : 'line-clamp-4')}>
        {text}
      </p>
      {!open && (
        <div className="pointer-events-none absolute inset-x-0 -bottom-1 h-10 bg-gradient-to-t from-background/80 to-transparent" />
      )}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="mt-1 text-[11px] font-medium opacity-80 hover:opacity-100 underline underline-offset-4"
        aria-expanded={open}
      >
        {open ? 'Show less' : 'Show more'}
      </button>
    </div>
  );
}

/* --------------------------- Component --------------------------- */

function ContextSelectedBarImpl({
  context,
  onOpenContexts,
  onClear,
  stickyTop = '4.5rem',
  disableMobile,
  disableDesktop,
}: Props) {
  const [isExpanded, setIsExpanded] = useState(false);
  const panelId = useId();
  const prefersReducedMotion = useReducedMotion();
  const cardRef = useRef<HTMLDivElement>(null);

  const sc = useMemo(() => (context ? parseStructured(context.content) : null), [context]);
  const title = useMemo(() => (context ? cleanTitle(sc?.title || context.name) : ''), [context, sc]);
  const desc = useMemo(() => (context ? sc?.description || context.description || '' : ''), [context, sc]);
  const tags = context?.tags ?? [];
  const goals = useMemo(() => normalizeGoals(sc?.background_goals), [sc]);

  if (!context) return null;

  /* --------------------------- Desktop Pill + Absolute Panel --------------------------- */
  const DesktopBar = disableDesktop ? null : (
    <div className="block z-50 sticky" style={{ top: stickyTop }}>
      {/* Anchor is relative so the expanded card can be absolutely positioned under the pill */}
      <div className="relative mx-auto w-full md:max-w-3xl px-2">
        {/* Pill */}
        <motion.div
          layout
          initial={false}
          animate={{ opacity: 1 }}
          className={cx(
            'group relative mx-auto mt-2 flex items-center gap-2 rounded-full border px-3 py-1.5',
            'bg-background/80 supports-[backdrop-filter]:backdrop-blur-xl border-indigo-500/20 shadow-sm'
          )}
        >
          {/* Brand dot */}
          <span className="inline-block size-2.5 rounded-full bg-gradient-to-r from-indigo-500 to-fuchsia-500" />

          {/* Title (compact) */}
          <button
            className="truncate text-xs md:text-sm font-medium text-foreground/90"
            onClick={() => setIsExpanded((v) => !v)}
            aria-expanded={isExpanded}
            aria-controls={panelId}
            title={title}
          >
            {title || 'Context selected'}
          </button>

          {/* Tags (first 2 only) */}
          <div className="ml-1 hidden md:flex gap-1">
            {tags.slice(0, 2).map((t) => (
              <Badge key={t} variant="outline" className="text-[10px]">
                #{t}
              </Badge>
            ))}
            {tags.length > 2 && (
              <Badge variant="outline" className="text-[10px] opacity-70">
                +{tags.length - 2}
              </Badge>
            )}
          </div>

          {/* Actions */}
          <div className="ml-auto flex items-center gap-1">
            <Button
              size="icon"
              variant="ghost"
              className="size-7"
              onClick={() => setIsExpanded((v) => !v)}
              aria-label={isExpanded ? 'Collapse context' : 'Expand context'}
            >
              {isExpanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
            </Button>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon"
                  variant="ghost"
                  className="size-7"
                  onClick={onOpenContexts}
                  aria-label="Change context"
                >
                  <LibraryBig className="size-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Change context</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button size="icon" variant="ghost" className="size-7" onClick={onClear} aria-label="Clear context">
                  <X className="size-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Clear</TooltipContent>
            </Tooltip>
          </div>
        </motion.div>

        {/* Absolutely-positioned expanded card UNDER the pill (no layout shift) */}
        <AnimatePresence initial={false}>
          {isExpanded && (
            <motion.div
              key={`expanded-${context.id}`}
              id={panelId}
              initial={{ opacity: 0, y: prefersReducedMotion ? 0 : -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: prefersReducedMotion ? 0 : -8 }}
              transition={{ duration: prefersReducedMotion ? 0 : 0.2, ease: 'easeOut' }}
              className="absolute inset-x-0 top-[calc(100%+10px)] px-2 z-50"
            >
              <div
                ref={cardRef}
                className={cx(
                  'relative overflow-hidden rounded-2xl border shadow-lg',
                  'bg-background/80 supports-[backdrop-filter]:backdrop-blur-2xl supports-[backdrop-filter]:backdrop-saturate-150',
                  'border-white/15 dark:border-white/10 ring-1 ring-black/5 dark:ring-white/5'
                )}
                role="region"
                aria-labelledby={`${panelId}-title`}
              >
                {/* Iridescent ambient overlays */}
                <div className="pointer-events-none absolute -right-28 -top-28 size-64 rounded-full bg-fuchsia-500/15 blur-3xl" />
                <div className="pointer-events-none absolute -left-28 -bottom-28 size-64 rounded-full bg-indigo-500/15 blur-3xl" />
                <div className="pointer-events-none absolute inset-0 [mask-image:radial-gradient(70%_55%_at_50%_0%,black,transparent)] bg-gradient-to-b from-white/10 to-transparent" />

                {/* Header */}
                <div className="relative px-4 md:px-5 pt-3 pb-2 border-b border-white/10">
                  <div className="flex items-center gap-2">
                    <span
                      className="inline-flex items-center justify-center rounded-lg border border-white/15 bg-background/60 size-6 text-indigo-600"
                      aria-hidden
                    >
                      <LumachorMark variant="black" />
                    </span>
                    <div className="min-w-0">
                      <div id={`${panelId}-title`} className="font-semibold text-sm md:text-[0.8rem] leading-tight truncate">
                        {title}
                      </div>
                      <div className="text-[11px] opacity-70">
                        {new Date(context.createdAt).toLocaleDateString()} • {tags.length} tag{tags.length === 1 ? '' : 's'}
                      </div>
                    </div>
                    <div className="ml-auto">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="size-8"
                        onClick={() => setIsExpanded(false)}
                        aria-label="Collapse"
                      >
                        <X className="size-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Full tag set */}
                  {tags.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {tags.map((t) => (
                        <span
                          key={t}
                          className="inline-flex items-center rounded-full border px-2 py-[3px] text-[10px] leading-none border-white/15 bg-white/5"
                        >
                          #{t}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Body */}
                <div className="relative px-4 md:px-5 py-3">
                  {/* Description with clamp */}
                  {desc ? <DescriptionClamp text={desc} /> : null}

                  {/* Goals */}
                  {goals.length > 0 && (
                    <div className="mt-3">
                      <div className="text-xs font-medium opacity-80 mb-1.5">Background & Goals</div>
                      <ul className="list-disc font-light pl-5 space-y-1.5 text-xs md:text-[13px] opacity-90">
                        {goals.map((g, i) => (
                          <li key={i}>{g}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Example prompts (preview first 3) */}
                  {Array.isArray(sc?.example_prompts) && sc!.example_prompts!.length > 0 && (
                    <div className="font-light mt-3">
                      <div className="text-xs font-medium opacity-80 mb-1.5">Example prompts</div>
                      <ul className="space-y-1.5 text-[12px] md:text-[13px] opacity-90">
                        {sc!.example_prompts!.slice(0, 3).map((p, i) => (
                          <li key={i} className="rounded-md border border-white/10 bg-white/5 px-2.5 py-1">
                            {p}
                          </li>
                        ))}
                        {sc!.example_prompts!.length > 3 && (
                          <li className="text-[11px] opacity-70 mt-1">
                            +{sc!.example_prompts!.length - 3} more in the full context
                          </li>
                        )}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );

  // (Optional) mobile version can be added similarly behind `disableMobile`

  return <>{DesktopBar}</>;
}

export const ContextSelectedBar = memo(ContextSelectedBarImpl);

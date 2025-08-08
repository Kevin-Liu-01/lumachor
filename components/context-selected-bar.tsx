'use client';

import * as React from 'react';
import { memo, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { ChevronDown, ChevronUp, LibraryBig, X } from 'lucide-react';
import cx from 'classnames';

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
        {/* Pill (no AnimatePresence to avoid flashing) */}
        <motion.div
          layout
          initial={false}
          animate={{ opacity: 1 }}
          className={cx(
            'group relative mx-auto mt-2 flex items-center gap-2 rounded-full border px-3 py-1.5',
            'bg-background/80 backdrop-blur border-indigo-500/20 shadow-sm'
          )}
        >
          {/* Brand dot */}
          <span className="inline-block size-2.5 rounded-full bg-gradient-to-r from-indigo-500 to-fuchsia-500" />

          {/* Title (compact) */}
          <button
            className="truncate text-xs md:text-sm font-medium text-foreground/90"
            onClick={() => setIsExpanded((v) => !v)}
            aria-expanded={isExpanded}
            aria-controls="context-card-desktop"
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
              id="context-card-desktop"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className={cx(
                'absolute left-0 right-0 top-[calc(100%+8px)]  px-2',
               
              )}
            >
              <div className={cx( 'overflow-hidden rounded-2xl border',
                'bg-gradient-to-r from-indigo-500/[0.06] via-fuchsia-500/[0.06] to-pink-500/[0.06]',
                'border-indigo-500/20 backdrop-blur-sm shadow-lg')}>

              {/* Ambient glows */}
              <div className="pointer-events-none absolute -right-24 -top-24 size-48 rounded-full bg-fuchsia-500/10 blur-3xl" />
              <div className="pointer-events-none absolute -left-20 -bottom-20 size-48 rounded-full bg-indigo-500/10 blur-3xl" />

              <div className="pb-5 pt-2 px-4 md:px-5">
                <div className="flex items-center gap-2">
                  <span className="text-xs uppercase tracking-wide opacity-60">Context details</span>
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
                        className="inline-flex items-center rounded-md border border-indigo-500/30 px-2 py-[3px] text-[10px] leading-none"
                      >
                        #{t}
                      </span>
                    ))}
                  </div>
                )}

                {/* Long description */}
                {desc && <p className="mt-3 text-xs md:text-sm leading-relaxed opacity-85">{desc}</p>}

                {/* Goals */}
                {goals.length > 0 && (
                  <div className="mt-3">
                    <div className="text-xs font-medium opacity-80 mb-1.5">Background & Goals</div>
                    <ul className="list-disc pl-5 space-y-1.5 text-xs md:text-[13px] opacity-90">
                      {goals.map((g, i) => (
                        <li key={i}>{g}</li>
                      ))}
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

  return <>{DesktopBar}</>;
}

export const ContextSelectedBar = memo(ContextSelectedBarImpl);

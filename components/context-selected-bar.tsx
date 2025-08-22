"use client";

import * as React from "react";
import { memo, useMemo, useState, useId } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ChevronDown, ChevronUp, LibraryBig, X } from "lucide-react";
import cx from "classnames";
import LumachorMark from "./lumachormark";
import { TooltipProvider } from "@radix-ui/react-tooltip";

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
  return s.replace(/^\s*(?:\*\*Title\*\*|#+)\s*/i, "").trim();
}

function parseStructured(content: string): StructuredContext | null {
  try {
    const obj = JSON.parse(content);
    if (
      obj &&
      typeof obj === "object" &&
      typeof (obj as any).title === "string" &&
      typeof (obj as any).description === "string"
    ) {
      return obj as StructuredContext;
    }
  } catch {}
  return null;
}

function toLines(maybeArray?: unknown): string[] {
  if (Array.isArray(maybeArray)) return maybeArray.map(String).filter(Boolean);
  if (typeof maybeArray === "string") {
    return maybeArray
      .split(/\n|•|-|\*/g)
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [];
}

/* --------------------------- Helpers --------------------------- */

function DescriptionClamp({
  text,
  expanded,
  onToggle,
  collapsedLines = 4,
}: {
  text: string;
  expanded: boolean;
  onToggle: () => void;
  collapsedLines?: number;
}) {
  return (
    <div className="group font-light relative">
      <p
        className={cx(
          "text-xs md:text-sm leading-relaxed opacity-90",
          expanded ? "" : "line-clamp-4" // keep Tailwind happy; collapsedLines is for semantics
        )}
        style={
          !expanded && collapsedLines !== 4
            ? ({ WebkitLineClamp: collapsedLines } as React.CSSProperties)
            : undefined
        }
      >
        {text}
      </p>
      {!expanded && (
        <div className="pointer-events-none absolute inset-x-0 -bottom-1 h-10 bg-gradient-to-t from-background/80 to-transparent" />
      )}
      <button
        type="button"
        onClick={onToggle}
        className="mt-1 text-[11px] font-medium opacity-80 hover:opacity-100 underline underline-offset-4"
        aria-expanded={expanded}
      >
        {expanded ? "Show less" : "Show more"}
      </button>
    </div>
  );
}

/* --------------------------- Component --------------------------- */

function ContextSelectedBarImpl({
  context,
  onOpenContexts,
  onClear,
  stickyTop = "4.5rem",
  disableMobile,
  disableDesktop,
}: Props) {
  const [isExpanded, setIsExpanded] = useState(false); // shows the card
  const [detailsOpen, setDetailsOpen] = useState(false); // shows *more inside* the card
  const panelId = useId();
  const prefersReducedMotion = useReducedMotion();

  const sc = useMemo(
    () => (context ? parseStructured(context.content) : null),
    [context]
  );
  const title = useMemo(
    () => (context ? cleanTitle(sc?.title || context.name) : ""),
    [context, sc]
  );
  const desc = useMemo(
    () => (context ? sc?.description || context.description || "" : ""),
    [context, sc]
  );
  const tags = context?.tags ?? [];

  const goals = useMemo(() => toLines(sc?.background_goals), [sc]);
  const tone = useMemo(() => toLines(sc?.tone_style), [sc]);
  const constraints = useMemo(() => toLines(sc?.constraints_scope), [sc]);
  const examples = useMemo(() => toLines(sc?.example_prompts), [sc]);

  if (!context) return null;

  /* --------------------------- Desktop Pill + Absolute Panel --------------------------- */
  const DesktopBar = disableDesktop ? null : (
    <div className="block z-50 sticky" style={{ top: stickyTop }}>
      <div className="relative mx-auto w-full md:max-w-3xl px-2">
        {/* Pill */}
        <motion.div
          layout
          initial={false}
          animate={{ opacity: 1 }}
          className={cx(
            "group relative mx-auto mt-2 flex items-center gap-2 rounded-full border px-3 py-1.5",
            "bg-background/80 supports-[backdrop-filter]:backdrop-blur-xl border-indigo-500/20 shadow-sm"
          )}
        >
          <span className="inline-block size-2.5 rounded-full bg-gradient-to-r from-indigo-500 to-fuchsia-500" />

          <button
            className="truncate text-xs md:text-sm font-medium text-foreground/90"
            onClick={() => setIsExpanded((v) => !v)}
            aria-expanded={isExpanded}
            aria-controls={panelId}
            title={title}
          >
            {title || "Context selected"}
          </button>

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

          <div className="ml-auto flex items-center gap-1">
            <Button
              size="icon"
              variant="ghost"
              className="size-7"
              onClick={() => setIsExpanded((v) => !v)}
              aria-label={isExpanded ? "Collapse context" : "Expand context"}
            >
              {isExpanded ? (
                <ChevronUp className="size-4" />
              ) : (
                <ChevronDown className="size-4" />
              )}
            </Button>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="size-7"
                    onClick={() => {
                      setIsExpanded(true);
                      setDetailsOpen(true); // jump straight to details if user is switching
                      onOpenContexts();
                    }}
                    aria-label="Change context"
                  >
                    <LibraryBig className="size-4" />
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
                    onClick={() => {
                      setIsExpanded(false);
                      setDetailsOpen(false);
                      onClear();
                    }}
                    aria-label="Clear context"
                  >
                    <X className="size-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Clear</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </motion.div>

        {/* Expanded card UNDER the pill */}
        <AnimatePresence initial={false}>
          {isExpanded && (
            <motion.div
              key={`expanded-${context.id}`}
              id={panelId}
              initial={{ opacity: 0, y: prefersReducedMotion ? 0 : -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: prefersReducedMotion ? 0 : -8 }}
              transition={{
                duration: prefersReducedMotion ? 0 : 0.2,
                ease: "easeOut",
              }}
              className="absolute inset-x-0 top-[calc(100%+10px)] px-2 z-50"
            >
              <div
                className={cx(
                  // fixed rem cap (no vh) + flex so body can scroll; header stays pinned
                  "relative overflow-hidden rounded-2xl border shadow-lg flex flex-col",
                  "max-h-[32rem] sm:max-h-[30rem]",
                  "bg-background/80 supports-[backdrop-filter]:backdrop-blur-2xl supports-[backdrop-filter]:backdrop-saturate-150",
                  " border-indigo-500/20 ring-1 ring-black/5 dark:ring-white/5"
                )}
                role="region"
                aria-labelledby={`${panelId}-title`}
              >
                {/* Ambience */}
                <div className="pointer-events-none absolute -right-28 -top-28 size-64 rounded-full bg-fuchsia-500/15 blur-3xl" />
                <div className="pointer-events-none absolute -left-28 -bottom-28 size-64 rounded-full bg-indigo-500/15 blur-3xl" />
                <div className="pointer-events-none absolute inset-0 [mask-image:radial-gradient(70%_55%_at_50%_0%,black,transparent)] bg-gradient-to-b from-white/10 to-transparent" />

                {/* Header (pinned) */}
                <div className="relative px-4 md:px-5 pt-3 pb-2 border-b border-white/10 shrink-0">
                  <div className="flex items-center gap-2">
                    <span
                      className="inline-flex items-center justify-center rounded-lg border border-white/15 bg-background/60 size-6 text-indigo-600"
                      aria-hidden
                    >
                      <LumachorMark variant="black" />
                    </span>
                    <div className="min-w-0">
                      <div
                        id={`${panelId}-title`}
                        className="font-semibold text-sm md:text-[0.8rem] leading-tight truncate"
                      >
                        {title}
                      </div>
                      <div className="text-[11px] opacity-70">
                        {new Date(context.createdAt).toLocaleDateString()} •{" "}
                        {tags.length} tag{tags.length === 1 ? "" : "s"}
                      </div>
                    </div>
                    <div className="ml-auto">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="size-8"
                        onClick={() => {
                          setIsExpanded(false);
                          setDetailsOpen(false);
                        }}
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
                        <Badge
                          key={t}
                          variant="outline"
                          className="px-2 text-[10px] leading-none"
                        >
                          #{t}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                {/* Body (scrollable) */}
                <div
                  className="relative px-4 md:px-5 py-3 overflow-y-auto overscroll-contain min-h-0"
                  style={{ scrollbarGutter: "stable" as any }}
                >
                  {/* Description with global “Show more” controlling *all* details */}
                  {desc ? (
                    <DescriptionClamp
                      text={desc}
                      expanded={detailsOpen}
                      onToggle={() => setDetailsOpen((v) => !v)}
                      collapsedLines={4}
                    />
                  ) : null}

                  {/* Goals */}
                  {goals.length > 0 && (
                    <div className="mt-3">
                      <div className="text-xs font-medium opacity-80 mb-1.5">
                        Background & Goals
                      </div>
                      <ul className="list-disc font-light pl-5 space-y-1.5 text-xs md:text-[13px] opacity-90">
                        {(detailsOpen ? goals : goals.slice(0, 5)).map(
                          (g, i) => (
                            <li key={i}>{g}</li>
                          )
                        )}
                      </ul>
                      {!detailsOpen && goals.length > 5 && (
                        <button
                          type="button"
                          className="mt-1 text-[11px] underline underline-offset-4 opacity-80 hover:opacity-100"
                          onClick={() => setDetailsOpen(true)}
                        >
                          Show all goals (+{goals.length - 5})
                        </button>
                      )}
                    </div>
                  )}

                  {/* Tone & Style (hidden until detailsOpen) */}
                  {tone.length > 0 && detailsOpen && (
                    <div className="mt-3">
                      <div className="text-xs font-medium opacity-80 mb-1.5">
                        Tone & Style
                      </div>
                      <ul className="list-disc font-light pl-5 space-y-1.5 text-xs md:text-[13px] opacity-90">
                        {tone.map((t, i) => (
                          <li key={i}>{t}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Constraints & Scope (hidden until detailsOpen) */}
                  {constraints.length > 0 && detailsOpen && (
                    <div className="mt-3">
                      <div className="text-xs font-medium opacity-80 mb-1.5">
                        Constraints & Scope
                      </div>
                      <ul className="list-disc font-light pl-5 space-y-1.5 text-xs md:text-[13px] opacity-90">
                        {constraints.map((c, i) => (
                          <li key={i}>{c}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Example prompts */}
                  {examples.length > 0 && (
                    <div className="font-light mt-3">
                      <div className="text-xs font-medium opacity-80 mb-1.5">
                        Example prompts
                      </div>
                      <ul className="space-y-1.5 text-[12px] md:text-[13px] opacity-90">
                        {(detailsOpen ? examples : examples.slice(0, 3)).map(
                          (p, i) => (
                            <li
                              key={i}
                              className="rounded-md border border-white/10 bg-white/5 px-2.5 py-1"
                            >
                              {p}
                            </li>
                          )
                        )}
                      </ul>
                      {!detailsOpen && examples.length > 3 && (
                        <button
                          type="button"
                          className="mt-1 text-[11px] underline underline-offset-4 opacity-80 hover:opacity-100"
                          onClick={() => setDetailsOpen(true)}
                        >
                          Show all examples (+{examples.length - 3})
                        </button>
                      )}
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

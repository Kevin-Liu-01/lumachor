'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useWindowSize } from 'usehooks-ts';

import { memo } from 'react';
import { LibraryBig, Plus, Sparkles } from 'lucide-react';

import { ModelSelector } from '@/components/model-selector';
import { SidebarToggle } from '@/components/sidebar-toggle';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useSidebar } from '@/components/ui/sidebar';
import { type VisibilityType, VisibilitySelector } from '@/components/visibility-selector';
import type { Session } from 'next-auth';
import LumachorMark from './lumachormark';


function LumachorLogo() {
  return (
    <div className="sm:hidden flex items-center gap-2 mr-4">
      <div className="text-indigo-600">
        <LumachorMark />
      </div>
      <span className="text-sm font-extrabold tracking-wide">LUMACHOR</span>
    </div>
  );
}

/* --------------------------- Header UI --------------------------- */

function PureChatHeader({
  chatId,
  selectedModelId,
  selectedVisibilityType,
  isReadonly,
  session,
  onOpenContexts,
  selectedCount = 0,
}: {
  chatId: string;
  selectedModelId: string;
  selectedVisibilityType: VisibilityType;
  isReadonly: boolean;
  session: Session;
  onOpenContexts?: () => void;
  selectedCount?: number;
}) {
  const router = useRouter();
  const { open } = useSidebar();
  const { width: windowWidth } = useWindowSize();

  return (
    <header
      className={[
        // layout
        'sticky top-0 z-40',
        'border-b',
        // glass + gradient
        'bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/55',
        'relative',
      ].join(' ')}
    >
      {/* glow accents */}
      <div className="pointer-events-none absolute -top-12 -left-10 size-36 rounded-full bg-indigo-500/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-10 left-1/3 size-36 -translate-x-1/2 rounded-full bg-fuchsia-500/10 blur-3xl" />

      <div className="w-full px-2 md:px-3">
        <div className="flex items-center gap-2 py-2">
          {/* <SidebarToggle /> */}
          <LumachorLogo />

        
          {/* Middle rail: model + visibility (hidden when readonly) */}
          {!isReadonly && (
            <div
              className={[
                'ml-2 hidden md:flex items-center gap-2',
                'rounded-xl border px-2 py-1.5',
                'bg-gradient-to-r from-indigo-500/[0.06] to-fuchsia-500/[0.06]',
                'border-indigo-500/20',
              ].join(' ')}
            >
              <ModelSelector session={session} selectedModelId={selectedModelId} />
              <div className="mx-1 h-5 w-px bg-foreground/10" />
              <VisibilitySelector chatId={chatId} selectedVisibilityType={selectedVisibilityType} />
            </div>
          )}

          {/* Right: Contexts trigger */}
          {!isReadonly && (
            <div className="ml-auto flex items-center gap-4">
              {/* New Chat (compact on mobile) */}
          {(!open || windowWidth < 768) && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  className="ml-1 p-2 h-8"
                  onClick={() => {
                    router.push('/');
                    router.refresh();
                  }}
                >
                  <Plus className="mr-1 size-4" />
                  <span className="hidden md:inline">New Chat</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>New Chat</TooltipContent>
            </Tooltip>
          )}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="secondary"
                    className={[
                      'px-3 mr-2 py-2 h-8',
                      'bg-gradient-to-r from-indigo-600/10 to-fuchsia-600/10',
                      'border border-indigo-500/20',
                    ].join(' ')}
                    onClick={onOpenContexts}
                  >
                    <LibraryBig className="mr-2 size-4 " />
                    Contexts
                    {selectedCount > 0 && (
                      <span className="ml-2 inline-flex items-center justify-center min-w-5 h-5 rounded-full bg-foreground text-background text-[10px] px-1">
                        {selectedCount}
                      </span>
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Open Context Library</TooltipContent>
              </Tooltip>

              {/* Sparkles button for quick actions if you add them later */}
              {/* <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    className="hidden md:inline-flex h-8"
                    onClick={() => router.refresh()}
                  >
                    <Sparkles className="mr-2 size-4" />
                    Refresh
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Refresh the page</TooltipContent>
              </Tooltip> */}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

export const ChatHeader = memo(PureChatHeader, (prev, next) => {
  return (
    prev.selectedModelId === next.selectedModelId &&
    prev.selectedVisibilityType === next.selectedVisibilityType &&
    prev.selectedCount === next.selectedCount
  );
});

'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useWindowSize } from 'usehooks-ts';

import { ModelSelector } from '@/components/model-selector';
import { SidebarToggle } from '@/components/sidebar-toggle';
import { Button } from '@/components/ui/button';
import { PlusIcon } from './icons';
import { useSidebar } from './ui/sidebar';
import { memo } from 'react';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';
import { type VisibilityType, VisibilitySelector } from './visibility-selector';
import type { Session } from 'next-auth';
import { LibraryBig } from 'lucide-react';

// Simple Lumachor Logo
function LumachorLogo() {
  return (
    <div className="flex items-center gap-2 pl-1">
      <div className="size-6 rounded-md bg-gradient-to-br from-emerald-400 to-sky-500 grid place-items-center text-background font-black">
        L
      </div>
      <span className="text-sm font-semibold tracking-wide">Lumachor</span>
    </div>
  );
}

function PureChatHeader({
  chatId,
  selectedModelId,
  selectedVisibilityType,
  isReadonly,
  session,
  // NEW: open contexts dock + count
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
    <header className="flex sticky top-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b items-center gap-2 p-2 md:px-3">
      <SidebarToggle />
      <LumachorLogo />

      {(!open || windowWidth < 768) && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              className="order-2 md:order-1 md:px-2 px-2 md:h-fit ml-auto md:ml-0"
              onClick={() => {
                router.push('/');
                router.refresh();
              }}
            >
              <PlusIcon />
              <span className="md:sr-only">New Chat</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>New Chat</TooltipContent>
        </Tooltip>
      )}

      {!isReadonly && (
        <ModelSelector
          session={session}
          selectedModelId={selectedModelId}
          className="order-1 md:order-2"
        />
      )}

      {!isReadonly && (
        <VisibilitySelector
          chatId={chatId}
          selectedVisibilityType={selectedVisibilityType}
          className="order-1 md:order-3"
        />
      )}

      {/* Contexts trigger */}
      {!isReadonly && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              className="ml-auto order-4 hidden md:flex"
              variant="secondary"
              onClick={onOpenContexts}
            >
              <LibraryBig className="mr-2 size-4" />
              Contexts
              {selectedCount > 0 && (
                <span className="ml-2 inline-flex items-center justify-center min-w-5 h-5 rounded-full bg-foreground text-background text-xs px-1">
                  {selectedCount}
                </span>
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>Open Context Library</TooltipContent>
        </Tooltip>
      )}
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

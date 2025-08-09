'use client';

import type { User } from 'next-auth';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarSeparator,
  useSidebar,
} from '@/components/ui/sidebar';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { AnimatePresence, motion } from 'framer-motion';

import { Button } from '@/components/ui/button';

import { SidebarHistory } from '@/components/sidebar-history';
import { SidebarUserNav } from '@/components/sidebar-user-nav';

import { PlusIcon } from '@/components/icons'; // SearchIcon should exist in your icons; else import from lucide-react
import { PanelLeftClose, PanelLeftOpen, SearchIcon, LibraryBigIcon } from 'lucide-react'; // for collapse/expand
import cx from 'classnames';
import { is } from 'drizzle-orm';

/* ------------------------ Lumachor mark ------------------------ */
function LumachorMark() {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" className="size-7">
      {/* BG tile (indigo-500 @ 0.10) */}
      <rect rx="8" ry="8" x="2" y="2" width="28" height="28" fill="#6366F1" opacity="0.10" />
      {/* Shell / swirl (indigo-600 @ 0.84) */}
      <path
        d="M8 18c0-4.418 3.582-8 8-8 2.8 0 5.26 1.46 6.67 3.66.2.3.06.7-.26.86l-2.22 1.1a.66.66 0 0 1-.84-.23A5.33 5.33 0 0 0 16 13.33c-2.95 0-5.33 2.38-5.33 5.34V22c0 .37-.3.67-.67.67H8.67A.67.67 0 0 1 8 22v-4Z"
        fill="#4F46E5" opacity="0.84"
      />
      {/* Accent dot (indigo-100 @ 0.65) */}
      <circle cx="22.5" cy="21" r="2.5" fill="#E0E7FF" opacity="0.65" />
    </svg>
  );
}

/* --------------------------- App Sidebar --------------------------- */

export function AppSidebar({ user }: { user: User | undefined }) {
  const router = useRouter();
  const { state, toggleSidebar, setOpenMobile } = useSidebar();

  const isCollapsed = state === 'collapsed';

  return (
    <Sidebar
      // 🟣 KEY: collapse to icon rail instead of hiding
      collapsible="icon"
      className="isolate group-data-[side=left]:border-r-0 z-[60]"
    >
      {/* soft ambient glows */}
     <div className="pointer-events-none absolute -top-10 -right-8 size-40 rounded-full bg-fuchsia-500/10 blur-3xl z-0" />
      <div className="pointer-events-none absolute -bottom-16 -left-10 size-44 rounded-full bg-indigo-500/10 blur-3xl z-0" />

      {/* Header: logo (left) + collapse/expand (right) */}
      <SidebarHeader className="px-1 pt-2 pb-1">
        <div className="flex items-center justify-between gap-2">
          {/* Logo: acts as HOME when expanded; acts as EXPAND when collapsed */}
          {isCollapsed ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={toggleSidebar}
                  className="rounded-xl p-1.5  text-indigo-600 hover:bg-indigo-500/10"
                  aria-label="Expand sidebar"
                >
                  <LumachorMark />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">Expand</TooltipContent>
            </Tooltip>
          ) : (
            <Link
              href="/"
              onClick={() => setOpenMobile(false)}
              className="flex items-center gap-2 rounded-xl p-1.5 hover:bg-gradient-to-r hover:from-indigo-500/[0.08] hover:to-fuchsia-500/[0.08] transition"
            >
              <div className="text-indigo-600">
                <LumachorMark />
              </div>
              <span className={`${isCollapsed?'hidden':''} text-sm font-extrabold tracking-wide group-data-[collapsible=icon]:hidden`}>
                LUMACHOR
              </span>
            </Link>
          )}

          {/* Collapse / Expand toggle (always visible top-right) */}
          <Tooltip>
            {!isCollapsed &&<TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                className="size-8"
                onClick={toggleSidebar}
              >
              <PanelLeftClose className="size-4" />
              </Button>
            </TooltipTrigger>}
            <TooltipContent side="right">
              {isCollapsed ? 'Expand' : 'Collapse'}
            </TooltipContent>
          </Tooltip>
        </div>
      </SidebarHeader>

      {/* Primary actions (New chat, Search, Library) */}
      <SidebarContent className="px-2">
        <SidebarMenu className="mb-1">
          {/* New Chat */}
          <SidebarMenuItem>
            <SidebarMenuButton
              tooltip="New chat"
              onClick={() => {
                setOpenMobile(false);
                router.push('/');
                router.refresh();
              }}
            >
              <PlusIcon />
              <span className="group-data-[collapsible=icon]:hidden">New chat</span>
            </SidebarMenuButton>
          </SidebarMenuItem>

          {/* Search Chats (route or open your search UI) */}
          <SidebarMenuItem>
            <SidebarMenuButton
              tooltip="Search chats"
              onClick={() => {
                // change this to your search UI route / modal
                router.push('/search');
              }}
            >
              <SearchIcon />
              <span className="group-data-[collapsible=icon]:hidden">Search chats</span>
            </SidebarMenuButton>
          </SidebarMenuItem>

          {/* Library (open contexts/library) */}
          <SidebarMenuItem>
            <SidebarMenuButton
              tooltip="Library"
              onClick={() => {
                // if you open your ContextLibraryDock from a store, call it here
                router.push('/library'); // or trigger your dock open
              }}
            >
              <LibraryBigIcon className="size-4" />
              <span className="group-data-[collapsible=icon]:hidden">Library</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>

        <SidebarSeparator />

        {/* Chats (already grouped by date in your SidebarHistory) */}
        <SidebarContent className="pb-2 flex-1 min-h-0 overflow-hidden">
  <motion.div
    // use the provider’s state: 'expanded' | 'collapsed'
    animate={state}
    initial={false}
    variants={{
      expanded: { opacity: 1, y: 0, filter: 'blur(0px)', transition: { duration: 0.18 } },
      collapsed: { opacity: 0, y: -4, filter: 'blur(3px)', transition: { duration: 0.14 } },
    }}
    className={cx(
      'rounded-xl border h-full flex flex-col overflow-hidden',
      'bg-gradient-to-b from-indigo-500/[0.04] to-transparent border-indigo-500/20',
      // prevent hover/scroll while collapsed
      isCollapsed && 'pointer-events-none',
    )}
    aria-hidden={isCollapsed}
  >
    <SidebarHistory user={user} />
  </motion.div>
</SidebarContent>
      </SidebarContent>

      {/* Footer: user profile (icon-only when collapsed) */}
       {/* Footer floats above history */}
      <SidebarFooter className="px-2 pb-3 relative z-20">
        {user && (
          <div className="rounded-md border bg-gradient-to-r from-fuchsia-500/[0.04] to-transparent border-fuchsia-500/20 relative">
            <SidebarUserNav user={user} />
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}

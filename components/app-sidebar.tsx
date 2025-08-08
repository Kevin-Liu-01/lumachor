'use client';

import type { User } from 'next-auth';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

import { PlusIcon } from '@/components/icons';
import { SidebarHistory } from '@/components/sidebar-history';
import { SidebarUserNav } from '@/components/sidebar-user-nav';
import { Button } from '@/components/ui/button';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  useSidebar,
} from '@/components/ui/sidebar';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';

/* ------------------------ Lumachor mark ------------------------ */
function LumachorMark() {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" className="size-7">
      <rect rx="8" ry="8" x="2" y="2" width="28" height="28" fill="currentColor" opacity="0.15" />
      <path
        d="M8 18c0-4.418 3.582-8 8-8 2.8 0 5.26 1.46 6.67 3.66.2.3.06.7-.26.86l-2.22 1.1a.66.66 0 0 1-.84-.23A5.33 5.33 0 0 0 16 13.33c-2.95 0-5.33 2.38-5.33 5.34V22c0 .37-.3.67-.67.67H8.67A.67.67 0 0 1 8 22v-4Z"
        fill="currentColor"
        opacity="0.85"
      />
      <circle cx="22.5" cy="21" r="2.5" fill="currentColor" />
    </svg>
  );
}

/* --------------------------- Sidebar --------------------------- */

export function AppSidebar({ user }: { user: User | undefined }) {
  const router = useRouter();
  const { setOpenMobile } = useSidebar();

  return (
      <Sidebar className="group-data-[side=left]:border-r-0">

      {/* soft ambient glows */}
      <div className="pointer-events-none absolute -top-10 -right-8 size-40 rounded-full bg-fuchsia-500/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-16 -left-10 size-44 rounded-full bg-indigo-500/10 blur-3xl" />

      <SidebarHeader className="px-3 pt-3 pb-2">
        <SidebarMenu>
          <div className="flex items-center justify-between">
            <Link
              href="/"
              onClick={() => setOpenMobile(false)}
              className="flex items-center gap-2 rounded-xl px-2 py-1.5 hover:bg-gradient-to-r hover:from-indigo-500/[0.08] hover:to-fuchsia-500/[0.08] transition"
            >
              <div className="text-indigo-600">
                <LumachorMark />
              </div>
              {/* <span className="text-sm font-semibold tracking-wide">Chat</span> */}
            </Link>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  type="button"
                  className={[
                    'h-8 px-2',
                    'border border-transparent',
                    'hover:border-indigo-500/20',
                    'bg-gradient-to-r hover:from-indigo-600/10 hover:to-fuchsia-600/10',
                  ].join(' ')}
                  onClick={() => {
                    setOpenMobile(false);
                    router.push('/');
                    router.refresh();
                  }}
                >
                  <PlusIcon />
                </Button>
              </TooltipTrigger>
              <TooltipContent align="end">New Chat</TooltipContent>
            </Tooltip>
          </div>

          {/* slim divider */}
          <div className="mt-2 h-px w-full bg-gradient-to-r from-transparent via-foreground/10 to-transparent" />
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent className="px-2 pb-2">
        {/* history rail w/ soft card feel */}
        <div
          className={[
            'rounded-xl border',
            'bg-gradient-to-b from-indigo-500/[0.04] to-transparent',
            'border-indigo-500/20',
            'px-1.5 py-1.5',
          ].join(' ')}
        >
          <SidebarHistory user={user} />
        </div>
      </SidebarContent>

      <SidebarFooter className="px-2 pb-3">
        {user && (
          <div
            className={[
              'rounded-xl border',
              'bg-gradient-to-r from-fuchsia-500/[0.04] to-transparent',
              'border-fuchsia-500/20',
              'px-2 py-2',
            ].join(' ')}
          >
            <SidebarUserNav user={user} />
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}

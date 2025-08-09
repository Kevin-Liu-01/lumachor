'use client';

import type { User } from 'next-auth';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import { useTheme } from 'next-themes';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';

import {
  Check,
  ChevronUp,
  Copy,
  ExternalLink,
  LibraryBig,
  Loader2,
  LogIn,
  LogOut,
  Mail,
  Moon,
  Settings,
  Sun,
  UserRound,
} from 'lucide-react';
import { toast } from './toast';
import { guestRegex } from '@/lib/constants';
import { useCallback, useMemo, useState } from 'react';

export function SidebarUserNav({ user }: { user: User }) {
  const router = useRouter();
  const { data, status } = useSession();
  const { setTheme, resolvedTheme } = useTheme();

  const isGuest = guestRegex.test(data?.user?.email ?? '');
  const email = user?.email ?? 'guest@example.com';
  const displayName = useMemo(
    () => user?.name || email.split('@')[0],
    [user?.name, email],
  );

  const [copied, setCopied] = useState(false);
  const copyEmail = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(email);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      toast({ type: 'error', description: 'Could not copy email.' });
    }
  }, [email]);

  const nextTheme = resolvedTheme === 'dark' ? 'light' : 'dark';

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            {status === 'loading' ? (
              <SidebarMenuButton className="h-10 justify-between data-[state=open]:bg-sidebar-accent bg-background data-[state=open]:text-sidebar-accent-foreground">
                <div className="flex items-center gap-2">
                  <div className="size-6 rounded-full bg-zinc-500/30 animate-pulse" />
                  <span className="rounded-md bg-zinc-500/30 text-transparent animate-pulse">
                    Loading…
                  </span>
                </div>
                <Loader2 className="size-4 animate-spin text-zinc-500" />
              </SidebarMenuButton>
            ) : (
              <SidebarMenuButton
                data-testid="user-nav-button"
                className="h-10 gap-2 data-[state=open]:bg-sidebar-accent bg-background data-[state=open]:text-sidebar-accent-foreground"
              >
                <Image
                  src={`https://avatar.vercel.sh/${email}`}
                  alt={email}
                  width={24}
                  height={24}
                  className="rounded-full"
                />
                <span data-testid="user-email" className="truncate">
                  {isGuest ? 'Guest' : displayName}
                </span>
                <ChevronUp className="ml-auto" />
              </SidebarMenuButton>
            )}
          </DropdownMenuTrigger>

          <DropdownMenuContent
            data-testid="user-nav-menu"
            side="top"
            align="end"
            sideOffset={6}
            className="z-[90] w-[--radix-popper-anchor-width] mx-2 shadow-lg"
          >
            {/* Header */}
            <DropdownMenuLabel className="px-3 py-2">
              <div className="flex items-center gap-3">
                <Image
                  src={`https://avatar.vercel.sh/${email}`}
                  alt={email}
                  width={36}
                  height={36}
                  className="rounded-full ring-1 ring-black/5 dark:ring-white/10"
                />
                <div className="min-w-0">
                  <div className="font-medium truncate">{displayName}</div>
                  <div className="text-xs text-muted-foreground flex items-center gap-1 truncate">
                    <Mail className="size-3.5" />
                    <span className="truncate">{isGuest ? 'Guest' : email}</span>
                  </div>
                </div>
                <span className="ml-auto inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wide">
                  {isGuest ? 'Guest' : 'Member'}
                </span>
              </div>
            </DropdownMenuLabel>

            <DropdownMenuSeparator />

            {/* Quick actions */}
            <DropdownMenuItem
              className="cursor-pointer"
              onSelect={() => setTheme(nextTheme)}
            >
              {resolvedTheme === 'dark' ? <Sun className="size-4" /> : <Moon className="size-4" />}
              <span>Switch to {nextTheme} mode</span>
            </DropdownMenuItem>

            {/* {!isGuest && (
              <DropdownMenuItem
                className="cursor-pointer"
                onSelect={() => router.push('/profile')}
              >
                <UserRound className="size-4" />
                <span>Profile</span>
                <ExternalLink className="ml-auto size-3.5 opacity-60" />
              </DropdownMenuItem>
            )}

            <DropdownMenuItem
              className="cursor-pointer"
              onSelect={() => router.push('/settings')}
            >
              <Settings className="size-4" />
              <span>Settings</span>
              <ExternalLink className="ml-auto size-3.5 opacity-60" />
            </DropdownMenuItem>

            <DropdownMenuItem
              className="cursor-pointer"
              onSelect={() => router.push('/library')}
            >
              <LibraryBig className="size-4" />
              <span>Library</span>
              <ExternalLink className="ml-auto size-3.5 opacity-60" />
            </DropdownMenuItem> */}

            <DropdownMenuSeparator />

            {/* Utilities */}
            {!isGuest && (
              <DropdownMenuItem className="cursor-pointer" onSelect={copyEmail}>
                {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
                <span>{copied ? 'Copied email' : 'Copy email'}</span>
              </DropdownMenuItem>
            )}

            <DropdownMenuSeparator />

            {/* Auth */}
            <DropdownMenuItem asChild data-testid="user-nav-item-auth">
              <button
                type="button"
                className="w-full cursor-pointer"
                onClick={() => {
                  if (status === 'loading') {
                    toast({
                      type: 'error',
                      description: 'Checking authentication status, please try again!',
                    });
                    return;
                  }
                  if (isGuest) {
                    router.push('/login');
                  } else {
                    signOut({ redirectTo: '/' });
                  }
                }}
              >
                {isGuest ? (
                  <div className="flex items-center gap-2">
                    <LogIn className="size-4" />
                    <span>Log in</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-destructive dark:text-red-500">
                    <LogOut className="size-4" />
                    <span>Sign out</span>
                  </div>
                )}
              </button>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}

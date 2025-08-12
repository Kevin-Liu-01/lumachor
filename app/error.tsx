"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { RefreshCcw, Home, Search } from "lucide-react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Optional: log to your observability
    // console.error('App error:', error);
  }, [error]);

  return (
    <div className="relative min-h-dvh">
      {/* ambient glows */}
      <div className="pointer-events-none absolute -top-28 -left-24 size-[22rem] rounded-full bg-indigo-500/15 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-36 -right-24 size-[26rem] rounded-full bg-sky-500/10 blur-3xl" />

      <main className="mx-auto max-w-4xl px-4 py-10 md:py-16">
        <div className="rounded-2xl border bg-background/70 backdrop-blur p-6 md:p-8 relative overflow-hidden">
          <div
            className="absolute -right-10 -top-10 size-44 rounded-full bg-indigo-500/10 blur-2xl"
            aria-hidden
          />
          <div
            className="absolute -left-12 -bottom-12 size-48 rounded-full bg-sky-500/10 blur-2xl"
            aria-hidden
          />

          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">
            Something went wrong
          </h1>
          <p className="mt-2 text-sm md:text-base opacity-70">
            An unexpected error occurred. You can retry the last action, or hop
            to a safe page.
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-2">
            <Button onClick={() => reset()}>
              <RefreshCcw className="mr-2 size-4" />
              Try again
            </Button>
            <Button variant="outline" asChild>
              <Link href="/">
                <Home className="mr-2 size-4" />
                Go Home
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/search">
                <Search className="mr-2 size-4" />
                Search Chats
              </Link>
            </Button>
          </div>

          {error?.digest && (
            <div className="mt-6 rounded-xl border bg-background/60 p-4">
              <div className="text-xs opacity-70">Error id</div>
              <code className="text-xs break-all">{error.digest}</code>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

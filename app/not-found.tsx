"use client";
import Link from "next/link";
import { ArrowLeft, Home, Search, LibraryBig, Sparkles } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="relative min-h-dvh">
      {/* ambient glows */}
      <div className="pointer-events-none absolute -top-32 -left-24 size-[22rem] rounded-full bg-indigo-500/15 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 -right-24 size-[26rem] rounded-full bg-sky-500/10 blur-3xl" />

      <main className="mx-auto max-w-5xl px-4 py-10 md:py-16">
        <div className="rounded-2xl border bg-background/70 backdrop-blur p-6 md:p-8 relative overflow-hidden">
          <div
            className="absolute -right-10 -top-10 size-44 rounded-full bg-indigo-500/10 blur-2xl"
            aria-hidden
          />
          <div
            className="absolute -left-12 -bottom-12 size-48 rounded-full bg-sky-500/10 blur-2xl"
            aria-hidden
          />

          <div className="flex items-start gap-4">
            <div className="grid place-items-center rounded-xl border size-11 shrink-0 bg-background/80">
              <Sparkles className="size-5 opacity-70" />
            </div>
            <div className="min-w-0">
              <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">
                Page not found
              </h1>
              <p className="mt-2 text-sm md:text-base opacity-70 max-w-2xl">
                We couldn’t find what you’re looking for. Try searching your
                chats or head back to a safe place.
              </p>
            </div>
          </div>

          {/* action row */}
          <div className="mt-6 flex flex-wrap items-center gap-2">
            <Link
              href="/"
              className={`${buttonVariants({
                variant: "default",
              })} inline-flex items-center`}
            >
              <Home className="mr-2 size-4" />
              <span>Go Home</span>
            </Link>

            <Link
              href="/search"
              className={`${buttonVariants({
                variant: "outline",
              })} inline-flex items-center`}
            >
              <Search className="mr-2 size-4" />
              <span>Search Chats</span>
            </Link>

            <Link
              href="/library"
              className={`${buttonVariants({
                variant: "outline",
              })} inline-flex items-center`}
            >
              <LibraryBig className="mr-2 size-4" />
              <span>Open Library</span>
            </Link>

            <Link
              href="#"
              onClick={(e) => {
                e.preventDefault();
                history.back();
              }}
              className={`${buttonVariants({
                variant: "ghost",
              })} inline-flex items-center`}
            >
              <ArrowLeft className="mr-2 size-4" />
              <span>Go Back</span>
            </Link>
          </div>
        </div>

        {/* suggestion grid */}
        <section className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-3">
          {[
            {
              title: "Check your URL",
              desc: "Typos happen—make sure the link is correct.",
            },
            {
              title: "Try Search",
              desc: "Titles and message contents are both searchable.",
              href: "/search",
            },
            {
              title: "Browse Library",
              desc: "Use or publish reusable contexts.",
              href: "/library",
            },
          ].map((card, i) => (
            <div
              key={i}
              className="rounded-2xl border bg-background/60 backdrop-blur p-4 transition hover:bg-background/80"
            >
              <div className="font-medium">{card.title}</div>
              <p className="mt-1 text-sm opacity-70">{card.desc}</p>
              {card.href && (
                <div className="mt-3">
                  <Link
                    href={card.href}
                    className={buttonVariants({
                      variant: "outline",
                      size: "sm",
                    })}
                  >
                    <span>Open</span>
                  </Link>
                </div>
              )}
            </div>
          ))}
        </section>
      </main>
    </div>
  );
}

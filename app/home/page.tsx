"use client";
import type { NextPage } from "next";
import Link from "next/link";
import {
  ArrowRight,
  BookCopy,
  Bot,
  BrainCircuit,
  ChevronRight,
  Database,
  FilePlus2,
  FlaskConical,
  Library,
  Search,
  Sparkles,
  Zap,
} from "lucide-react";
import { type ReactNode, useState, useEffect, useRef, useMemo } from "react";
import {
  motion,
  AnimatePresence,
  useMotionValue,
  useTransform,
} from "framer-motion";
import { clsx } from "clsx";
import LumachorMark from "@/components/lumachormark";
import { LiveChatDemo } from "@/components/live-chat-demo"; // Import the new component
import ThemedImage from "@/components/ui/themed-image";
import { Header } from "@/components/ui/header";
import { ComparisonSection } from "@/components/comparison-section";

// --- REUSABLE UI & ANIMATION COMPONENTS ---

const FADE_IN_ANIMATION_VARIANTS = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0 },
};

const SectionWrapper = ({
  id,
  children,
  className,
  ...props
}: {
  id?: string;
  children: ReactNode;
  className?: string;
}) => (
  <motion.section
    initial="hidden"
    whileInView="visible"
    viewport={{ once: true, amount: 0.2 }}
    transition={{ staggerChildren: 0.1, duration: 0.5, ease: "easeOut" }}
    variants={FADE_IN_ANIMATION_VARIANTS}
    className={clsx("py-16 sm:py-24", className)}
    {...props}
  >
    {children}
  </motion.section>
);

const SectionHeader = ({
  title,
  description,
  badge,
  className,
}: {
  title: any;
  description: string;
  badge?: string;
  className?: string;
}) => (
  <motion.div
    variants={FADE_IN_ANIMATION_VARIANTS}
    className={className ? clsx(className) : "text-center"}
  >
    {badge && <p className="font-semibold text-indigo-400">{badge}</p>}
    <h2 className="mt-2 text-3xl font-bold tracking-tighter sm:text-4xl">
      {title}
    </h2>
    <p className="mt-4 max-w-2xl mx-auto text-lg text-muted-foreground">
      {description}
    </p>
  </motion.div>
);

const GlassCard = ({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) => (
  <div
    className={clsx(
      "rounded-2xl border border-white/10 bg-white/5 p-2 backdrop-blur-sm",
      className
    )}
  >
    {children}
  </div>
);

const GridPattern = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    aria-hidden="true"
    className="pointer-events-none absolute inset-0 size-full stroke-black/[0.04] dark:fill-white/[0.02] dark:stroke-white/5"
    {...props}
  >
    <defs>
      <pattern
        id="grid"
        width={60}
        height={60}
        patternUnits="userSpaceOnUse"
        x={-1}
        y={-1}
      >
        <path d="M.5 60V.5H60" fill="none" />
      </pattern>
    </defs>
    <rect width="100%" height="100%" strokeWidth={0} fill="url(#grid)" />
  </svg>
);

// --- 3D TILT CARD COMPONENT ---
const TiltCard = ({
  className,
  imageLight,
  imageDark,
  alt,
}: {
  className?: string;
  imageLight: string;
  imageDark: string;
  alt: string;
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotateX = useTransform(y, [-1, 1], ["15deg", "-15deg"]);
  const rotateY = useTransform(x, [-1, 1], ["-15deg", "15deg"]);

  const handleMouseMove = (
    event: React.MouseEvent<HTMLDivElement, MouseEvent>
  ) => {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    const { width, height } = rect;
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;
    x.set((mouseX / width - 0.5) * 2);
    y.set((mouseY / height - 0.5) * 2);
  };
  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        rotateX,
        rotateY,
        transformStyle: "preserve-3d",
      }}
      className={clsx(
        "relative rounded-xl border border-white/10 bg-white/5 shadow-2xl shadow-indigo-500/20 transition-transform duration-500 ease-out",
        className
      )}
    >
      <div
        style={{ transform: "translateZ(20px)", transformStyle: "preserve-3d" }}
      >
        <ThemedImage
          lightSrc={imageLight}
          darkSrc={imageDark}
          alt={alt}
          width={1200}
          height={724}
          className="rounded-[0.7rem] border border-white/10"
        />
      </div>
    </motion.div>
  );
};

// --- HERO IMAGE CAROUSEL COMPONENT ---
const HeroImageCarousel = () => {
  const images = [
    {
      light: "/images/library-light.png",
      dark: "/images/library-dark.png",
      alt: "Lumachor Context Library",
    },
    {
      light: "/images/dock-light.png",
      dark: "/images/dock-dark.png",
      alt: "Lumachor Context Builder",
    },
    {
      light: "/images/chat-light.png",
      dark: "/images/chat-dark.png",
      alt: "Lumachor Chat Interface",
    },
  ];
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((prevIndex) => (prevIndex + 1) % images.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [images.length]);

  return (
    <div className="relative mt-16 sm:mt-40 max-w-5xl h-48 mx-auto">
      {/* Bottom Fade */}
      <div className="absolute z-30 inset-x-0 -bottom-1/2 w-screen h-1/2 bg-gradient-to-t from-background to-transparent" />

      {/* Aesthetic Lines (Top Left) */}
      {/* <div className="absolute top-4 left-4 w-16 h-0.5 bg-white/10 rotate-45 before:block before:absolute before:-left-6 before:top-2 before:w-0.5 before:h-8 before:bg-white/10" /> */}
      {/* Aesthetic Lines (Bottom Right) */}
      {/* <div className="absolute bottom-4 right-4 w-16 h-0.5 bg-white/10 -rotate-45 after:block after:absolute after:-right-6 after:bottom-2 after:w-0.5 after:h-8 after:bg-white/10" /> */}

      <AnimatePresence mode="wait">
        <motion.div
          key={index}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.8, ease: "easeInOut" }}
          className="relative z-10 flex items-center justify-center"
        >
          <div className="relative size-full flex items-center justify-center">
            {/* Glow Halo */}
            <div
              className="absolute inset-0 rounded-2xl pointer-events-none"
              style={{
                boxShadow: `
              0 0 20px rgba(98, 0, 238, 0.3),
              0 0 60px rgba(98, 0, 238, 0.2),
              0 0 120px rgba(98, 0, 238, 0.1)
            `,
              }}
            />

            <ThemedImage
              lightSrc={images[index].light}
              darkSrc={images[index].dark}
              alt={images[index].alt}
              width={2400}
              height={1454}
              className="rounded-2xl border border-white/10 shadow-2xl shadow-indigo-500/10"
              priority={index === 0}
              style={{
                objectFit: "contain",
                width: "100%",
              }}
            />
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

const LandingPage: NextPage = () => {
  return (
    <div className="relative overflow-hidden text-foreground w-full min-h-screen">
      <GridPattern />
      <div className="pointer-events-none absolute inset-0 z-10">
        <div className="absolute -top-32 -left-48 size-96 rounded-full bg-indigo-500/20 blur-3xl" />
        <div className="absolute -bottom-48 -right-32 size-96 rounded-full bg-fuchsia-500/20 blur-3xl" />
      </div>

      <Header />

      <main className="pt-16">
        <SectionWrapper className="pt-24 pb-28 sm:pt-32 sm:pb-24 overflow-hidden border-b border-gray-300 dark:border-white/10">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative">
            {/* 3D Tilt Cards */}
            <div
              className="absolute -top-24 -right-24 w-[500px] h-[400px] hidden lg:block"
              style={{ perspective: "1000px" }}
            >
              <div className="relative size-full">
                <TiltCard
                  imageLight="/images/context-dark.png"
                  imageDark="/images/context-light.png"
                  alt="Context Card"
                  className="absolute top-0 right-0 w-[350px] rotate-12"
                />
                <TiltCard
                  imageLight="/images/dock-light.png"
                  imageDark="/images/dock-dark.png"
                  alt="Dock Card"
                  className="absolute top-0 right-0 w-[350px] rotate-12"
                />
                <TiltCard
                  imageLight="/images/chat-light.png"
                  imageDark="/images/chat-dark.png"
                  alt="Context Card"
                  className="absolute top-[-30rem] right-32 w-[300px] -rotate-12"
                />
                <TiltCard
                  imageLight="/images/library-light.png"
                  imageDark="/images/library-dark.png"
                  alt="Library Card"
                  className="absolute top-[-30rem] right-32 w-[300px] -rotate-12"
                />
              </div>
            </div>
            <div className="relative z-10 text-center lg:text-left max-w-2xl">
              <motion.div
                variants={FADE_IN_ANIMATION_VARIANTS}
                className="inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3 py-1 text-sm font-medium text-indigo-400"
              >
                <Sparkles className="size-4 text-indigo-500" />
                <span>{"AI Just Got Smarter."}</span>
              </motion.div>
              <motion.h1
                variants={FADE_IN_ANIMATION_VARIANTS}
                className="mt-6 text-4xl font-extrabold tracking-tighter sm:text-6xl lg:text-7xl bg-clip-text text-transparent bg-gradient-to-b from-zinc-400 to-zinc-800 dark:from-white dark:to-zinc-400"
              >
                {"Reimagining AI with Bulletproof Context."}
              </motion.h1>
              <motion.p
                variants={FADE_IN_ANIMATION_VARIANTS}
                className="mt-6 text-lg text-muted-foreground"
              >
                {
                  "Lumachor isn't another wrapper—it's the engine that unlocks 100% of an LLM's power by injecting expert-level context into every conversation, instantly."
                }
              </motion.p>
              <motion.div
                variants={FADE_IN_ANIMATION_VARIANTS}
                className="mt-8 flex justify-center lg:justify-start"
              >
                <Link
                  href="/"
                  className="relative inline-flex items-center font-bold justify-center rounded-xl text-sm text-white h-11 px-7 py-2 group overflow-hidden"
                >
                  {/* Animated Shimmering Gradient Background */}
                  <motion.div
                    animate={{
                      backgroundPosition: ["0% 50%", "150% 50%"],
                    }}
                    transition={{
                      duration: 5,
                      ease: "linear",
                      repeat: Infinity,
                      repeatType: "reverse",
                    }}
                    className="absolute inset-[-200%] z-0 bg-[linear-gradient(110deg,theme(colors.indigo.500),45%,theme(colors.fuchsia.500),55%,theme(colors.indigo.500))] bg-[length:200%_100%]"
                  />

                  {/* Splash Effect on Hover */}
                  <div className="absolute inset-0 z-10">
                    <motion.div
                      className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.25),transparent)]"
                      initial={{ scale: 0, opacity: 0 }}
                      whileHover={{ scale: 4, opacity: 1 }}
                      transition={{
                        type: "spring",
                        stiffness: 300,
                        damping: 20,
                      }}
                    />
                  </div>

                  {/* Content */}
                  <motion.div
                    className="relative z-20 flex items-center"
                    whileHover="hover"
                    initial="initial"
                  >
                    <span>Start for Free</span>
                    <motion.div
                      variants={{
                        initial: { x: 0 },
                        hover: { x: 5 },
                      }}
                      transition={{
                        type: "spring",
                        stiffness: 400,
                        damping: 12,
                      }}
                      className="ml-2"
                    >
                      <ArrowRight className="size-4" />
                    </motion.div>
                  </motion.div>
                </Link>
              </motion.div>
            </div>
          </div>
          <HeroImageCarousel />
        </SectionWrapper>

        {/* --- HOW IT WORKS DIAGRAM --- */}
        <SectionWrapper
          id="how-it-works"
          className="relative overflow-hidden border-b border-gray-300 dark:border-white/10"
        >
          {/* Add a subtle dot pattern to this section's background for visual diversity */}
          {/* Light Mode Dot Pattern (Visible by default, hidden in dark mode) */}
          <div className="absolute block dark:hidden inset-0 -z-10 size-full bg-[radial-gradient(theme(colors.slate.200)_1px,transparent_1px)] [background-size:16px_16px]"></div>

          {/* Dark Mode Dot Pattern (Hidden by default, visible in dark mode) */}
          <div className="absolute hidden dark:block inset-0 -z-10 size-full bg-[radial-gradient(theme(colors.indigo.950)_1px,transparent_1px)] [background-size:16px_16px]"></div>

          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <SectionHeader
              badge="HOW IT WORKS"
              title={
                <>
                  From a simple prompt to a{" "}
                  <span className="text-indigo-400">studio-level</span> result.
                </>
              }
              description="Our turnkey content engine works silently in the background. You just talk, and Lumachor ensures the AI understands exactly what you need."
            />

            {/* The main container for the animated flow diagram */}
            <motion.div
              variants={{
                visible: { transition: { staggerChildren: 0.2 } },
              }}
              className="relative mt-20 flex flex-col items-center justify-between gap-8 md:flex-row md:gap-4"
            >
              {/* --- Step 1 --- */}
              <motion.div
                variants={FADE_IN_ANIMATION_VARIANTS}
                className="flex max-w-xs flex-col items-center gap-3 text-center"
              >
                <div className="relative">
                  <div className="absolute -inset-2 rounded-full bg-indigo-500/10 blur-xl"></div>
                  <div className="relative grid size-16 place-items-center rounded-full border-2 border-indigo-500/50 bg-indigo-500/10 text-indigo-400">
                    <Bot className="size-8" />
                  </div>
                </div>
                <h3 className="font-semibold">1. You Start a Chat</h3>
                <p className="text-xs text-muted-foreground">
                  Ask a question or give a command in plain English.
                </p>
              </motion.div>

              {/* --- Animated Connector --- */}
              {/* <motion.svg
                variants={FADE_IN_ANIMATION_VARIANTS}
                className="h-12 w-24 rotate-90 md:rotate-0"
                viewBox="0 0 100 2"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <motion.path
                  initial={{ pathLength: 0 }}
                  whileInView={{ pathLength: 1 }}
                  viewport={{ once: true, amount: 0.5 }}
                  transition={{ duration: 1, ease: "easeInOut" }}
                  d="M0 1H100"
                  stroke="url(#g_connector)"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeDasharray="4 4"
                />
                <defs>
                  <linearGradient id="g_connector">
                    <stop offset="0%" stopColor="#4f46e5" />
                    <stop offset="100%" stopColor="#a855f7" />
                  </linearGradient>
                </defs>
              </motion.svg> */}

              {/* --- Step 2 --- */}
              <motion.div
                variants={FADE_IN_ANIMATION_VARIANTS}
                className="flex max-w-xs flex-col items-center gap-3 text-center"
              >
                <div className="relative">
                  <div className="absolute -inset-4 rounded-full bg-fuchsia-500/10 blur-2xl"></div>
                  <div className="relative grid size-20 place-items-center rounded-full border-2 border-fuchsia-500/50 bg-fuchsia-500/10 text-fuchsia-400">
                    <div className="dark:hidden">
                      <LumachorMark
                        variant="white"
                        className="size-12 animate-pulse"
                      />
                    </div>
                    <div className="hidden dark:flex">
                      <LumachorMark
                        variant="black"
                        className="size-12 animate-pulse"
                      />
                    </div>
                  </div>
                </div>
                <h3 className="font-semibold">2. Lumachor Assembles Context</h3>
                <p className="text-xs text-muted-foreground">
                  Our engine retrieves a proven template or generates a new one
                  instantly.
                </p>
              </motion.div>

              {/* --- Animated Connector --- */}
              {/* <motion.svg
                variants={FADE_IN_ANIMATION_VARIANTS}
                className="h-12 w-24 rotate-90 md:rotate-0"
                viewBox="0 0 100 2"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <motion.path
                  initial={{ pathLength: 0 }}
                  whileInView={{ pathLength: 1 }}
                  viewport={{ once: true, amount: 0.5 }}
                  transition={{ duration: 1, ease: "easeInOut", delay: 0.2 }}
                  d="M0 1H100"
                  stroke="url(#g_connector_2)"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeDasharray="4 4"
                />
                <defs>
                  <linearGradient id="g_connector_2">
                    <stop offset="0%" stopColor="#a855f7" />
                    <stop offset="100%" stopColor="#22c55e" />
                  </linearGradient>
                </defs>
              </motion.svg> */}

              {/* --- Step 3 --- */}
              <motion.div
                variants={FADE_IN_ANIMATION_VARIANTS}
                className="flex max-w-xs flex-col items-center gap-3 text-center"
              >
                <div className="relative">
                  <div className="absolute -inset-2 rounded-full bg-green-500/10 blur-xl"></div>
                  <div className="relative grid size-16 place-items-center rounded-full border-2 border-green-500/50 bg-green-500/10 text-green-400">
                    <Sparkles className="size-8" />
                  </div>
                </div>
                <h3 className="font-semibold">3. You Get Superior Results</h3>
                <p className="text-xs text-muted-foreground">
                  The AI, now equipped with expert knowledge, gives a perfect
                  response.
                </p>
              </motion.div>
            </motion.div>
          </div>
        </SectionWrapper>

        <SectionWrapper id="demo">
          <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <SectionHeader
              badge="See Lumachor in Action"
              title="From Query to Expert Response"
              description="Watch how our engine seamlessly generates and applies context in real-time to transform a simple question into a studio-level answer."
            />
            <LiveChatDemo />
          </div>
        </SectionWrapper>

        {/* --- MERGED: CONTEXT DOCK & LIBRARY SECTIONS --- */}
        <SectionWrapper id="features">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-24">
            {/* CONTEXT DOCK */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <div>
                <SectionHeader
                  badge="INSTANT CONTEXT GENERATION"
                  title="The Context Dock"
                  description="Never start from a blank slate. Just describe what you need, and the Context Dock generates a comprehensive, structured context template in seconds."
                  className="text-left"
                />
                <div className="relative mt-8 flex flex-col gap-6 text-left">
                  <div className="flex items-start gap-4">
                    <div className="grid place-items-center size-10 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 shrink-0">
                      <Zap className="size-5" />
                    </div>
                    <div>
                      <h4 className="font-semibold">On-The-Fly Generation</h4>
                      <p className="text-sm text-muted-foreground">
                        Our AI-powered engine analyzes your request and builds a
                        multi-part context, including goals, tone, and
                        constraints.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="grid place-items-center size-10 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 shrink-0">
                      <FilePlus2 className="size-5" />
                    </div>
                    <div>
                      <h4 className="font-semibold">Structured & Reusable</h4>
                      <p className="text-sm text-muted-foreground">
                        The generated context is automatically saved and tagged
                        in your library, ready to be reused or refined later.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <motion.div variants={FADE_IN_ANIMATION_VARIANTS}>
                <GlassCard>
                  <div className="relative p-4">
                    <div className="absolute -top-0 left-1/2 -z-10 size-[25rem] -translate-x-1/2 rounded-full bg-indigo-500/10 dark:bg-indigo-500/20 blur-3xl" />
                    <ThemedImage
                      lightSrc="/images/dock-light.png"
                      darkSrc="/images/dock-dark.png"
                      alt="Context Dock UI"
                      width={1920}
                      height={1080}
                      className="rounded-lg border border-white/10"
                    />
                  </div>
                </GlassCard>
              </motion.div>
            </div>
            {/* CONTEXT LIBRARY */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <div className="lg:order-last">
                <SectionHeader
                  badge="TAGGED & CURATED"
                  title="The Context Library"
                  description="Your central hub for all contexts. Browse our curated collection or manage your own creations with powerful search and filtering."
                  className="text-left"
                />
                <div className="mt-8 flex flex-col gap-6 text-left">
                  <div className="flex items-start gap-4">
                    <div className="grid place-items-center size-10 rounded-lg bg-fuchsia-500/10 text-fuchsia-400 border border-fuchsia-500/20 shrink-0">
                      <BookCopy className="size-5" />
                    </div>
                    <div>
                      <h4 className="font-semibold">Pre-Built Templates</h4>
                      <p className="text-sm text-muted-foreground">
                        Get started immediately with contexts for coding,
                        writing, customer support, and more, all crafted by our
                        R&D lab.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="grid place-items-center size-10 rounded-lg bg-fuchsia-500/10 text-fuchsia-400 border border-fuchsia-500/20 shrink-0">
                      <Search className="size-5" />
                    </div>
                    <div>
                      <h4 className="font-semibold">
                        Powerful Search & Discovery
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        Quickly find the perfect context for any job using
                        full-text search and smart tag filtering.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <motion.div
                variants={FADE_IN_ANIMATION_VARIANTS}
                className="lg:order-first"
              >
                <GlassCard>
                  <div className="p-4">
                    <div className="absolute -top-0 left-1/2 -z-10 size-[25rem] -translate-x-1/2 rounded-full bg-indigo-500/10 dark:bg-indigo-500/20 blur-3xl" />

                    <ThemedImage
                      lightSrc="/images/library-light.png"
                      darkSrc="/images/library-dark.png"
                      alt="Context Library UI"
                      width={1200}
                      height={1454}
                      className="rounded-lg border border-white/10"
                    />
                  </div>
                </GlassCard>
              </motion.div>
            </div>
          </div>
        </SectionWrapper>

        {/* --- NEW, ANIMATED "CONTEXT IS THE MOAT" SECTION --- */}

        <SectionWrapper id="difference">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <SectionHeader
              badge="THE LUMACHOR DIFFERENCE"
              title="Context is the Moat"
              description="Without the right context, even the most powerful LLMs fail. We provide the missing link for consistently superior results."
            />
            <ComparisonSection />
          </div>
        </SectionWrapper>

        <SectionWrapper id="features">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <SectionHeader
              title="One Platform, Infinite Verticals"
              description="From enterprises to students, Lumachor provides the tools you need for studio-quality AI results with zero extra effort."
            />
            <div className="mt-12 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
              <GlassCard>
                <div className="flex size-10 items-center justify-center rounded-lg border border-indigo-500/30 bg-indigo-500/10 text-indigo-500">
                  <Zap className="size-6" />
                </div>
                <h3 className="mt-4 text-lg font-semibold">
                  {"Instant Context Generation"}
                </h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  {
                    "Tell us your goal. We either fetch a proven context or generate a new one on-the-fly, tailored to your exact needs."
                  }
                </p>
              </GlassCard>
              <GlassCard>
                <div className="flex size-10 items-center justify-center rounded-lg border border-fuchsia-500/30 bg-fuchsia-500/10 text-fuchsia-500">
                  <Library className="size-6" />
                </div>
                <h3 className="mt-4 text-lg font-semibold">
                  {"Tagged Context Library"}
                </h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  {
                    "Browse pre-built contexts for coding, cooking, interview prep, and more. Full-text search makes retrieval instant."
                  }
                </p>
              </GlassCard>
              <GlassCard>
                <div className="flex size-10 items-center justify-center rounded-lg border border-sky-500/30 bg-sky-500/10 text-sky-500">
                  <Bot className="size-6" />
                </div>
                <h3 className="mt-4 text-lg font-semibold">
                  {"Multi-Model Chat"}
                </h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  {
                    "Choose from OpenAI, Anthropic, and more at runtime. Your context is auto-injected for consistently superior answers."
                  }
                </p>
              </GlassCard>
            </div>
          </div>
        </SectionWrapper>

        <SectionWrapper id="flywheel">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <SectionHeader
              title="The Data-Driven Flywheel"
              description="Our R&D Lab turns real-world usage into ever-sharper contexts. Every conversation on our platform enriches our dataset, creating an unbeatable competitive moat."
            />
            <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8 text-center">
              {[
                {
                  icon: Bot,
                  title: "User Interactions",
                  desc: "High-quality, context-aided conversations.",
                },
                {
                  icon: Database,
                  title: "Labeled Data",
                  desc: "'Prompt + Context + Outcome' datasets.",
                },
                {
                  icon: FlaskConical,
                  title: "R&D Lab Analysis",
                  desc: "Benchmark, score, and refine what works.",
                },
                {
                  icon: BrainCircuit,
                  title: "Smarter Contexts",
                  desc: "Evolving library of superior templates.",
                },
              ].map((item) => (
                <motion.div
                  key={item.title}
                  variants={FADE_IN_ANIMATION_VARIANTS}
                  className="flex flex-col items-center gap-2 p-4"
                >
                  <div className="grid place-items-center size-16 rounded-full border-2 border-indigo-500/30 bg-indigo-500/10 text-indigo-400">
                    <item.icon className="size-8" />
                  </div>
                  <h3 className="font-semibold">{item.title}</h3>
                  <p className="text-xs text-muted-foreground">{item.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </SectionWrapper>

        <SectionWrapper>
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="relative overflow-hidden rounded-2xl">
              {/* Animated Gradient Background */}
              <motion.div
                animate={{
                  backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"],
                }}
                transition={{
                  duration: 15,
                  ease: "linear",
                  repeat: Infinity,
                }}
                className="absolute inset-0 z-0 bg-[linear-gradient(110deg,#a21caf,#7c3aed,#4f46e5,#3b82f6,#a21caf)] bg-[length:400%_400%]"
              />

              {/* Cut-off Image with Float Animation */}
              <motion.div
                animate={{
                  y: ["-5px", "5px", "-5px"],
                }}
                transition={{
                  duration: 8,
                  ease: "easeInOut",
                  repeat: Infinity,
                }}
                className="absolute -bottom-48 right-0 z-10 w-1/2 max-w-xs translate-x-1/4 translate-y-1/2 opacity-80 lg:w-1/3 lg:max-w-md"
              >
                <ThemedImage
                  lightSrc="/images/context-light.png"
                  darkSrc="/images/context-dark.png"
                  alt="Lumachor Context UI"
                  width={1080}
                  height={720}
                  className="rounded-md shadow-2xl"
                />
              </motion.div>

              <div className="relative z-20 p-8 text-center md:text-left">
                <h2 className="text-3xl font-bold tracking-tighter text-white sm:text-4xl ">
                  Stop Prompt-Wrestling. Start Building.
                </h2>
                <p className="mt-4 text-lg text-indigo-100 [text-shadow:0_1px_4px_rgba(0,0,0,0.2)]">
                  Unlock studio-quality AI results today. It takes less than a
                  minute to get started.
                </p>
                <div className="mt-8">
                  <Link
                    href="/"
                    className="group relative inline-flex items-center justify-center rounded-xl text-sm font-medium bg-white text-indigo-600 h-11 px-8 py-2 overflow-hidden"
                  >
                    {/* Shimmer effect on hover */}
                    <span className="absolute size-0 rounded-full bg-indigo-200 transition-all duration-300 group-hover:size-56"></span>
                    <span className="relative font-extrabold flex items-center">
                      {"Try Lumachor Now"}
                      <ChevronRight className="ml-2 size-4 transition-transform duration-200 group-hover:translate-x-1" />
                    </span>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </SectionWrapper>
      </main>

      <footer className="border-t border-white/10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="dark:hidden">
                <LumachorMark variant="white" />
              </div>
              <div className="hidden dark:flex">
                <LumachorMark />
              </div>

              <p className="text-sm text-muted-foreground">
                &copy; {new Date().getFullYear()}{" "}
                {"Lumachor, Inc. All rights reserved."}
              </p>
            </div>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <Link href="/privacy" className="hover:text-foreground">
                {"Privacy"}
              </Link>
              <Link href="/terms" className="hover:text-foreground">
                {"Terms"}
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;

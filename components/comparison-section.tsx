"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Code,
  GraduationCap,
  PenSquare,
  Zap,
  Bot,
  AlertCircle,
  CheckCircle,
  MousePointerClick,
} from "lucide-react"; // Added MousePointerClick
import { clsx } from "clsx";
import type { ReactNode, SVGProps } from "react";
import LumachorMark from "./lumachormark";

const comparisonData = [
  {
    name: "Technical Query",
    icon: Code,
    userMessage: "How do I make my API scalable?",
    withoutResponse:
      "Scalability refers to handling more work. Use strategies like load balancing and efficient database queries.",
    withoutAnalysis: {
      title: "Vague & Generic",
      text: "This answer is technically correct but useless. It lacks specific technologies, patterns, or any actionable advice tailored to the user's stack.",
      icon: AlertCircle,
      color: "red",
    },
    withResponse:
      "For your FastAPI app, a great approach is deploying it on AWS ECS with Fargate for serverless auto-scaling. It's cost-effective and highly scalable.",
    withAnalysis: {
      title: "Specific & Actionable",
      text: "By understanding the context (FastAPI), the AI provides a concrete, modern solution (ECS on Fargate) that the user can act on immediately.",
      icon: CheckCircle,
      color: "green",
    },
    contextMessage: "Context applied: 'FastAPI Scaling'...",
  },
  {
    name: "Creative Brief",
    icon: PenSquare,
    userMessage:
      "Write a short, exciting marketing email for a new productivity app.",
    withoutResponse:
      "Subject: New App Launch!\n\nCheck out our new productivity app. It helps you manage tasks. Download it today.",
    withoutAnalysis: {
      title: "Lacks Persuasion",
      text: "This email is bland and uninspired. It states facts but fails to create any excitement or urgency for the reader.",
      icon: AlertCircle,
      color: "red",
    },
    withResponse:
      "Subject: Your Most Productive Day Starts Now.\n\nMeet Flow, the new app that turns chaos into clarity. Stop juggling tasks and start achieving your goals. First 1000 users get 50% off!",
    withAnalysis: {
      title: "Engaging & Compelling",
      text: "The context helps the AI adopt a marketing tone, using an exciting subject, benefit-oriented language, and a clear call-to-action with urgency.",
      icon: CheckCircle,
      color: "green",
    },
    contextMessage: "Context applied: 'Product Hunt Launch Email'...",
  },
  {
    name: "Learning",
    icon: GraduationCap,
    userMessage:
      "Explain the Krebs Cycle in simple terms for a high school student.",
    withoutResponse:
      "The Krebs Cycle is a series of chemical reactions used by all aerobic organisms to release stored energy through the oxidation of acetyl-CoA derived from carbohydrates, fats, and proteins.",
    withoutAnalysis: {
      title: "Overly Technical",
      text: "This is a textbook definition filled with jargon. It's not tailored to the audience (a high school student) and is hard to understand.",
      icon: AlertCircle,
      color: "red",
    },
    withResponse:
      "Think of the Krebs Cycle as your body's tiny power plant. It takes the fuel from your food (like sugars) and, in a series of 8 steps, breaks it down to create ATP – the energy packets that power everything you do!",
    withAnalysis: {
      title: "Simple & Relatable",
      text: "Using an analogy (power plant) and simple language, the AI makes a complex topic accessible and memorable for the target audience.",
      icon: CheckCircle,
      color: "green",
    },
    contextMessage: "Context applied: 'Simple Science Explainer'...",
  },
];

const messageVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0 },
};

const UserMessage = ({ children }: { children: ReactNode }) => (
  <motion.div variants={messageVariants} className="flex justify-end">
    <div className="bg-indigo-600 text-white rounded-xl rounded-br-md p-3 max-w-sm text-sm shadow-md">
      {children}
    </div>
  </motion.div>
);

const AnalysisBubble = ({
  analysis,
}: {
  analysis: {
    title: string;
    text: string;
    icon: React.ElementType;
    color: string;
  };
}) => (
  <motion.div
    initial={{ opacity: 0, y: 5 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: 5 }}
    transition={{ duration: 0.2, ease: "easeOut" }}
    className={clsx(
      "absolute bottom-[calc(100%+8px)] backdrop-blur-xl z-30 left-10 w-64 p-3 rounded-lg border text-xs shadow-xl ",
      analysis.color === "red"
        ? "bg-red-500/30 border-red-500/20 text-red-800 dark:text-red-200"
        : "bg-green-500/30 border-green-500/20 text-green-800 dark:text-green-200"
    )}
  >
    <div className="flex items-center gap-2 font-bold">
      <analysis.icon
        className={clsx(
          "size-4",
          analysis.color === "red" ? "text-red-400" : "text-green-400"
        )}
      />
      {analysis.title}
    </div>
    <p className="mt-1 opacity-80">{analysis.text}</p>
  </motion.div>
);

const AssistantMessage = ({
  children,
  avatar,
  analysis,
}: {
  children: ReactNode;
  avatar: ReactNode;
  analysis: any;
}) => (
  <motion.div
    variants={messageVariants}
    className="relative cursor-pointer flex justify-start items-start gap-3 group"
  >
    <div className="shrink-0 size-8 grid place-items-center rounded-full bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/10">
      {avatar}
    </div>
    <div className="bg-slate-100 text-slate-800 dark:bg-zinc-800 dark:text-slate-200 border border-slate-200 dark:border-white/10 rounded-xl rounded-tl-md p-3 max-w-sm text-sm transition-transform duration-300 group-hover:scale-[1.02]">
      {children}
    </div>
    <div className="hidden lg:block">
      <AnimatePresence>
        {analysis && <AnalysisBubble analysis={analysis} />}
      </AnimatePresence>
    </div>
  </motion.div>
);

const ContextMessage = ({ children }: { children: ReactNode }) => (
  <motion.div
    variants={messageVariants}
    className="flex justify-center items-center gap-2 text-sm text-indigo-500 dark:text-indigo-400 py-3"
  >
    <span className="ml-2 inline-flex items-center gap-1 px-4 py-2 text-[0.8rem] rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-300">
      <Zap className="size-3 animate-pulse" />
      <p>{children}</p>
    </span>
  </motion.div>
);

export function ComparisonSection() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [hoveredAnalysis, setHoveredAnalysis] = useState<string | null>(null);

  return (
    <div className="mt-16 relative rounded-2xl border border-slate-200 dark:border-white/10 bg-white/50 dark:bg-zinc-900/50 p-4 sm:p-8 backdrop-blur-sm shadow-2xl shadow-slate-600/10 dark:shadow-black/20">
      <div className="absolute -top-40 left-1/2 -z-10 size-[50rem] -translate-x-1/2 rounded-full bg-indigo-500/10 dark:bg-indigo-500/20 blur-3xl" />

      {/* <div className="absolute -top-1/2 left-1/2 -z-10 size-96 -translate-x-1/2 rounded-full bg-indigo-500/10 dark:bg-indigo-500/20 blur-3xl" /> */}
      <div className="flex z-30 relative justify-center mb-8">
        <div className="flex items-center gap-2 p-1 rounded-full border border-slate-200 dark:border-white/10 bg-slate-100/80 dark:bg-zinc-900/80">
          {comparisonData.map((item, index) => (
            <button
              key={item.name}
              onClick={() => setActiveIndex(index)}
              className={clsx(
                "relative rounded-full px-4 py-1.5 text-sm font-medium transition-colors flex items-center gap-2",
                activeIndex === index
                  ? "text-white"
                  : "text-slate-600 dark:text-muted-foreground hover:text-slate-900 dark:hover:text-foreground"
              )}
            >
              {activeIndex === index && (
                <motion.div
                  layoutId="comparison-active-pill"
                  className="absolute inset-0 bg-indigo-600"
                  style={{ borderRadius: 9999 }}
                  transition={{ type: "spring", stiffness: 400, damping: 35 }}
                />
              )}
              <span className="relative z-10">
                <item.icon className="size-4" />
              </span>
              <span className="relative z-10">{item.name}</span>
            </button>
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={activeIndex}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
        >
          {/* ---------------------------------- */}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
            <div className="h-full">
              <h3 className="flex items-center justify-center gap-2 text-lg font-semibold text-red-500 dark:text-red-400">
                <AlertCircle className="size-4" /> Without Lumachor
              </h3>
              <p className="mt-1 text-xs text-muted-foreground mb-4 text-center italic">
                Answers that sound right but don’t help you move forward
              </p>
              <motion.div
                className="space-y-4 rounded-lg border border-dashed border-slate-300 dark:border-white/10 p-4 min-h-[320px] bg-slate-50 dark:bg-transparent"
                variants={{ visible: { transition: { staggerChildren: 0.2 } } }}
                initial="hidden"
                animate="visible"
              >
                <UserMessage>
                  {comparisonData[activeIndex].userMessage}
                </UserMessage>
                <div
                  onMouseEnter={() => setHoveredAnalysis("without")}
                  onMouseLeave={() => setHoveredAnalysis(null)}
                >
                  <AssistantMessage
                    avatar={
                      <Bot className="size-4 text-slate-500 dark:text-white/70" />
                    }
                    analysis={
                      hoveredAnalysis === "without"
                        ? comparisonData[activeIndex].withoutAnalysis
                        : null
                    }
                  >
                    {comparisonData[activeIndex].withoutResponse}
                  </AssistantMessage>
                </div>
              </motion.div>
            </div>
            <div className="h-full">
              <h3 className="flex items-center justify-center gap-2 text-lg font-semibold text-green-500 dark:text-green-400">
                <CheckCircle className="size-4" /> With Lumachor
              </h3>
              <p className="mt-1 text-xs text-muted-foreground mb-4 text-center italic">
                Context-aware, actionable advice you can trust
              </p>
              <motion.div
                className="space-y-4 rounded-lg border border-indigo-500/30 p-4 min-h-[320px] bg-indigo-500/5 dark:bg-indigo-500/10"
                variants={{
                  visible: {
                    transition: { staggerChildren: 0.2, delayChildren: 0.1 },
                  },
                }}
                initial="hidden"
                animate="visible"
              >
                <UserMessage>
                  {comparisonData[activeIndex].userMessage}
                </UserMessage>
                <ContextMessage>
                  {comparisonData[activeIndex].contextMessage}
                </ContextMessage>
                <div
                  onMouseEnter={() => setHoveredAnalysis("with")}
                  onMouseLeave={() => setHoveredAnalysis(null)}
                >
                  <AssistantMessage
                    avatar={
                      <>
                        <div className="dark:hidden">
                          <LumachorMark variant="white" />
                        </div>
                        <div className="hidden dark:flex">
                          <LumachorMark variant="black" />
                        </div>
                      </>
                    }
                    analysis={
                      hoveredAnalysis === "with"
                        ? comparisonData[activeIndex].withAnalysis
                        : null
                    }
                  >
                    {comparisonData[activeIndex].withResponse}
                  </AssistantMessage>
                </div>
              </motion.div>
            </div>
          </div>
          {/* --- NEW HINT FOR INTERACTIVITY --- */}
          <motion.div
            key={`hint-${activeIndex}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="hidden lg:flex items-center justify-center gap-2 text-xs text-muted-foreground mt-8"
          >
            <MousePointerClick className="size-3" />
            Hover over an assistant’s response for analysis
          </motion.div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

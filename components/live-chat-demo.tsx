"use client";

import { type ReactNode, useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { clsx } from "clsx";
import { LibraryBig, PlayCircle } from "lucide-react";
import {
  ContextSelectedBar,
  type ContextRow,
} from "@/components/context-selected-bar"; // Assumes this path is correct
import LumachorMark from "./lumachormark";
import { CornerLines } from "./ui/corner-lines";
import { useRouter } from "next/navigation"; // Import useRouter

// --- HELPER HOOK FOR TYPEWRITER EFFECT ---
const useTypewriter = (
  text: string,
  speed: number = 50,
  start: boolean = false
) => {
  const [displayText, setDisplayText] = useState("");
  useEffect(() => {
    if (!start) return;
    setDisplayText("");
    let i = 0;
    const typingInterval = setInterval(() => {
      if (i < text.length) {
        setDisplayText((prevText) => prevText + text.charAt(i));
        i++;
      } else {
        clearInterval(typingInterval);
      }
    }, speed);
    return () => clearInterval(typingInterval);
  }, [text, speed, start]);
  return displayText;
};

// --- MOCK & HELPER COMPONENTS FOR DEMO ---

const mockContext: ContextRow = {
  id: "ctx_123",
  name: "AWS Scaling Advisor",
  content: JSON.stringify({
    title: "AWS Scaling Advisor",
    description:
      "This chatbot serves as an AWS Scaling Advisor, providing expert guidance on scaling AWS resources efficiently. Its mission is to help users optimize their AWS infrastructure for performance, cost, and reliability, thereby enhancing their cloud operations.",
    background_goals: [
      "AWS offers various scaling services like Auto Scaling, Elastic Load Balancing, and DynamoDB Auto Scaling.",
      "The goal is to ensure high availability, fault tolerance, and cost-effectiveness in AWS environments.",
      "Understanding of AWS pricing models, particularly how scaling impacts costs, is crucial.",
      "Knowledge of different AWS services that can be scaled, including EC2, RDS, and ECS.",
      "Familiarity with AWS best practices for scaling, like predictive scaling and dynamic scaling policies.",
      "Objective is to provide actionable advice that aligns with AWS Well-Architected Framework principles.",
    ],
    tone_style: [
      "Professional yet approachable, to make complex AWS concepts accessible.",
      "Use clear, concise language with minimal jargon, explaining terms when necessary.",
      "Structure responses in a step-by-step format when detailing processes or solutions.",
      "Incorporate bullet points for listing options, benefits, or considerations.",
      "Maintain a supportive tone, encouraging users to ask follow-up questions.",
    ],
    constraints_scope: [
      "Avoid providing advice on non-AWS cloud platforms or services.",
      "Do not delve into detailed coding or script writing unless directly related to AWS scaling configurations.",
      "Stay within the scope of AWS scaling services; do not discuss general cloud computing concepts unrelated to AWS.",
      "Limit advice to current AWS offerings; do not speculate on future AWS features.",
      "Do not provide financial advice beyond AWS cost optimization related to scaling.",
    ],
  }),
  tags: ["aws", "scaling", "optimization"],
  description: "Expert AWS scaling advice.",
  createdBy: "lumachor-lab",
  createdAt: new Date().toISOString(),
};

const messageVariants = {
  initial: { opacity: 0, y: 20, scale: 0.95 },
  animate: { opacity: 1, y: 0, scale: 1 },
};
const UserMessage = ({ children }: { children: ReactNode }) => (
  <motion.div
    variants={messageVariants}
    className="flex justify-end items-start gap-2"
  >
    <div className="bg-indigo-600 text-white rounded-2xl rounded-br-md p-3 max-w-sm">
      {children}
    </div>
  </motion.div>
);
const AssistantMessage = ({ children }: { children: ReactNode }) => (
  <motion.div
    variants={messageVariants}
    className="flex justify-start items-start gap-2"
  >
    <div className="shrink-0 size-12 grid place-items-center rounded-full bg-background border border-white/10">
      <div className="dark:hidden">
        <LumachorMark variant="white" />
      </div>
      <div className="hidden dark:flex">
        <LumachorMark variant="black" />
      </div>
    </div>
    <div className="bg-background border border-white/10 rounded-2xl rounded-bl-md p-3 max-w-sm">
      {children}
    </div>
  </motion.div>
);
const ThinkingMessage = () => (
  <motion.div
    variants={messageVariants}
    className="flex justify-start items-start gap-2"
  >
    <div className="shrink-0 size-12 grid place-items-center rounded-full bg-background border border-white/10">
      <div className="dark:hidden">
        <LumachorMark variant="white" />
      </div>
      <div className="hidden dark:flex">
        <LumachorMark variant="black" />
      </div>
    </div>
    <div className="bg-background border border-white/10 rounded-2xl rounded-bl-md p-3 max-w-sm">
      <div className="flex items-center gap-2">
        <div className="size-2 bg-muted-foreground/50 rounded-full animate-pulse" />
        <div className="size-2 bg-muted-foreground/50 rounded-full animate-pulse [animation-delay:0.1s]" />
        <div className="size-2 bg-muted-foreground/50 rounded-full animate-pulse [animation-delay:0.2s]" />
      </div>
    </div>
  </motion.div>
);
const Spinner = ({ className }: { className?: string }) => (
  <svg
    className={clsx("animate-spin", className)}
    viewBox="0 0 24 24"
    width="14"
    height="14"
  >
    <circle
      className="opacity-25"
      cx="12"
      cy="12"
      r="10"
      stroke="currentColor"
      strokeWidth="4"
      fill="none"
    />
    <path
      className="opacity-90"
      fill="currentColor"
      d="M4 12a8 8 0 0 1 8-8v4a4 4 0 0 0-4 4H4z"
    />
  </svg>
);
const ProgressStripe = ({
  show,
  colorClass = "via-indigo-500",
}: {
  show: boolean;
  colorClass?: string;
}) =>
  show ? (
    <div className="absolute inset-x-0 mx-4 bottom-[-2px] h-[2px] overflow-hidden rounded-full">
      <motion.span
        className={clsx(
          "absolute h-full w-1/3 bg-gradient-to-r from-transparent to-transparent",
          colorClass
        )}
        animate={{ x: ["-120%", "220%"] }}
        transition={{ duration: 1.2, ease: "linear", repeat: Infinity }}
      />
    </div>
  ) : null;
const ArrowUpIcon = (props: { size: number }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={props.size}
    height={props.size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="m5 12 7-7 7 7" />
    <path d="M12 19V5" />
  </svg>
);

// --- LIVE CHAT DEMO COMPONENT ---

type PillState = "busy" | "ready-context" | "streaming-context" | "initial";
const stateStyles: Record<
  PillState,
  { wrap: string; dot: string; stripe: string; text?: string }
> = {
  initial: {
    wrap: "bg-emerald-500/10 border-emerald-500/30",
    dot: "from-emerald-500 to-teal-500",
    stripe: "via-emerald-500",
    text: "text-emerald-800 dark:text-emerald-200",
  },
  busy: {
    wrap: "bg-indigo-600/12 border-indigo-500/35",
    dot: "from-indigo-500 to-fuchsia-500",
    stripe: "via-indigo-500",
    text: "text-indigo-800 dark:text-indigo-200",
  },
  "ready-context": {
    wrap: "bg-violet-500/10 border-violet-500/30",
    dot: "from-violet-500 to-fuchsia-500",
    stripe: "via-violet-500",
    text: "dark:text-violet-200 text-violet-800",
  },
  "streaming-context": {
    wrap: "bg-fuchsia-500/10 border-fuchsia-500/30",
    dot: "from-fuchsia-500 to-rose-500",
    stripe: "via-fuchsia-500",
    text: "dark:text-fuchsia-200 text-fuchsia-800",
  },
};

export const LiveChatDemo = () => {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [messages, setMessages] = useState<ReactNode[]>([]);
  const [context, setContext] = useState<ContextRow | null>(null);
  const [pillState, setPillState] = useState<PillState>("initial");
  const [pillText, setPillText] = useState(
    "Auto-generate context on first message"
  );
  const [isTyping, setIsTyping] = useState(false);

  const fullInputText =
    "  How should I deploy my FastAPI app on AWS for scalability?";
  const typedText = useTypewriter(fullInputText, 40, isTyping);

  const demoTimeline = useMemo(
    () => [
      { action: "reset", duration: 1500 },
      { action: "startTyping", duration: 3000 },
      { action: "submit", duration: 1000 },
      { action: "addThinking", duration: 1000 },
      { action: "setContext", context: mockContext, duration: 2000 },
      {
        action: "addAssistantMessage",
        content:
          "Great question. With the 'AWS Scaling Advisor' context, I recommend AWS ECS on Fargate. It offers serverless container orchestration, balancing cost and performance. You'd containerize your app, push it to ECR, and define an ECS Task Definition.",
        duration: 5000,
      },
    ],
    []
  );

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    const runDemo = (currentStep: number) => {
      if (currentStep >= demoTimeline.length) {
        timeoutId = setTimeout(() => runDemo(0), 5000); // Restart
        return;
      }
      const {
        action,
        content,
        duration,
        context: newContext,
      } = demoTimeline[currentStep];

      switch (action) {
        case "reset":
          setMessages([]);
          setContext(null);
          setIsTyping(false);
          setPillState("initial");
          setPillText("Auto-generate context on first message");
          break;
        case "startTyping":
          setIsTyping(true);
          break;
        case "submit":
          setIsTyping(false);
          setMessages((prev) => [
            ...prev,
            <UserMessage key={currentStep}>{fullInputText}</UserMessage>,
          ]);
          setPillState("busy");
          setPillText("Generating context…");
          break;
        case "addThinking":
          setMessages((prev) => [
            ...prev,
            <ThinkingMessage key={currentStep} />,
          ]);
          break;
        case "setContext":
          setContext(newContext as ContextRow);
          setPillState("streaming-context");
          setPillText("Using context “AWS Scaling Advisor”...");
          break;
        case "addAssistantMessage":
          setMessages((prev) => [
            ...prev.filter((m) => (m as any).type !== ThinkingMessage),
            <AssistantMessage key={currentStep}>{content}</AssistantMessage>,
          ]);
          setPillState("ready-context");
          setPillText("Context “AWS Scaling Advisor” ready");
          break;
      }
      setStep(currentStep);
      timeoutId = setTimeout(() => runDemo(currentStep + 1), duration || 0);
    };
    runDemo(0);
    return () => clearTimeout(timeoutId);
  }, [demoTimeline]);

  const currentStyle = stateStyles[pillState];
  const isBusy = pillState === "busy";

  return (
    <div className="rounded-2xl border border-zinc/10 dark:border-white/10 bg-zinc-50 dark:bg-white/5 p-2 sm:p-4 backdrop-blur-sm mt-12 max-w-3xl mx-auto h-[520px] flex flex-col">
      <ContextSelectedBar
        context={context}
        onClear={() => {}}
        onOpenContexts={() => {}}
      />
      <CornerLines />

      <div className="flex-1 flex flex-col gap-4 overflow-hidden p-4">
        <AnimatePresence>{messages}</AnimatePresence>
      </div>
      <div className="mt-auto p-2 space-y-2">
        <div
          className={clsx(
            "relative flex border items-center gap-2 rounded-full px-3 py-1.5 shadow-sm",
            currentStyle.wrap
          )}
        >
          <span
            className={clsx(
              "inline-grid place-items-center size-3 rounded-full bg-gradient-to-r",
              currentStyle.dot
            )}
          >
            {isBusy && <Spinner className="text-white/95" />}
          </span>
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.span
              key={pillText}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.15 }}
              className={clsx("truncate text-xs md:text-sm", currentStyle.text)}
            >
              {pillText}
            </motion.span>
          </AnimatePresence>
          <div className="ml-auto flex items-center">
            <button
              type="button"
              className="h-7 px-3 gap-1 rounded-2xl flex items-center border border-white/10 bg-black/20 hover:bg-black/30"
            >
              <LibraryBig className="size-4 text-white/70" />
              <span className="hidden sm:inline text-xs text-white/70">
                Context
              </span>
            </button>
          </div>
          <ProgressStripe
            show={isBusy || pillState === "streaming-context"}
            colorClass={currentStyle.stripe}
          />
        </div>
        <div className="relative">
          <textarea
            readOnly
            className="w-full min-h-[48px] resize-none rounded-2xl !text-base bg-muted p-3 pr-12 dark:border-zinc-700"
            value={typedText + (isTyping ? "▋" : "")}
          />
          <div className="absolute bottom-4 right-3">
            <button
              className="rounded-full p-1.5 h-fit border dark:border-zinc-600 bg-white dark:bg-zinc-800"
              disabled={!isBusy && typedText.length < fullInputText.length}
            >
              {isBusy ? (
                <Spinner className="text-black dark:text-white" />
              ) : (
                <ArrowUpIcon size={14} />
              )}
            </button>
          </div>
        </div>
        {/* "Try it out" Button Overlay */}
        <AnimatePresence>
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            className="w-full flex"
          >
            <button
              onClick={() =>
                router.push(`/?context=04e96b29-4140-41dc-b59a-f362f174815c`)
              }
              className="group font-medium relative inline-flex items-center justify-center gap-3 rounded-xl text-sm ml-auto text-white px-3 py-2 bg-indigo-600/50 hover:bg-indigo-700/80 transition-all duration-300 hover:scale-[1.02]"
            >
              <PlayCircle className="size-5 transition-transform duration-300 group-hover:rotate-180" />
              Try This Context
            </button>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

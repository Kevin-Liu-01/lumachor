"use client";

import * as React from "react";
import { motion } from "framer-motion";
import cx from "classnames";

export function ShimmerOverlay({
  show,
  rounded = "rounded-2xl",
}: {
  show: boolean;
  rounded?: string;
}) {
  if (!show) return null;
  return (
    <motion.div
      aria-hidden
      className={cx(
        "pointer-events-none absolute inset-0 overflow-hidden",
        rounded
      )}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.15 }}
    >
      <motion.div
        className="absolute inset-y-0 w-1/2 bg-gradient-to-r from-transparent via-white/10 to-transparent dark:via-white/5"
        initial={{ left: "-55%" }}
        animate={{ left: ["-55%", "105%"] }}
        transition={{ duration: 1.25, ease: "linear", repeat: Infinity }}
      />
    </motion.div>
  );
}

export function TopStripeLoader({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <span
      aria-hidden
      className="pointer-events-none absolute inset-x-0 -top-px h-[2px] overflow-hidden"
    >
      <motion.span
        className="absolute top-0 h-[2px] w-[45%] rounded-full bg-gradient-to-r from-transparent via-fuchsia-500 to-transparent"
        style={{ filter: "drop-shadow(0 0 6px rgba(217,70,239,.35))" }}
        initial={{ x: "-50%" }}
        animate={{ x: ["-50%", "110%"] }}
        transition={{ duration: 1.1, ease: "linear", repeat: Infinity }}
      />
    </span>
  );
}

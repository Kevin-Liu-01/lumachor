type LumachorMarkProps = {
  /** default = colored mark; "black" = black bg + white icon; "white" = white bg + black icon */
  variant?: "default" | "black" | "white";
  /** Tailwind classes for sizing, etc. */
  className?: string;
  /** Accessible label (omit for decorative use) */
  label?: string;
};

export default function LumachorMark({
  variant = "default",
  className = "size-7",
  label,
}: LumachorMarkProps) {
  // Colors per variant
  const cfg =
    variant === "black"
      ? {
          tile: { fill: "#000000", opacity: 1 },
          swirl: { fill: "#FFFFFF", opacity: 1 },
          dot: { fill: "#FFFFFF", opacity: 1 },
        }
      : variant === "white"
      ? {
          tile: { fill: "#FFFFFF", opacity: 1 },
          swirl: { fill: "#000000", opacity: 1 },
          dot: { fill: "#000000", opacity: 1 },
        }
      : {
          // original colorful look
          tile: { fill: "#6366F1", opacity: 0.1 }, // indigo-500 @ 10%
          swirl: { fill: "#4F46E5", opacity: 0.84 }, // indigo-600 @ 84%
          dot: { fill: "#E0E7FF", opacity: 0.65 }, // indigo-100 @ 65%
        };

  return (
    <svg
      viewBox="0 0 32 32"
      className={className}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      {/* rounded tile background */}
      <rect
        rx="8"
        ry="8"
        x="2"
        y="2"
        width="28"
        height="28"
        fill={cfg.tile.fill}
        opacity={cfg.tile.opacity}
      />

      {/* shell / swirl */}
      <path
        d="M8 18c0-4.418 3.582-8 8-8 2.8 0 5.26 1.46 6.67 3.66.2.3.06.7-.26.86l-2.22 1.1a.66.66 0 0 1-.84-.23A5.33 5.33 0 0 0 16 13.33c-2.95 0-5.33 2.38-5.33 5.34V22c0 .37-.3.67-.67.67H8.67A.67.67 0 0 1 8 22v-4Z"
        fill={cfg.swirl.fill}
        opacity={cfg.swirl.opacity}
      />

      {/* accent dot */}
      <circle
        cx="22.5"
        cy="21"
        r="2.5"
        fill={cfg.dot.fill}
        opacity={cfg.dot.opacity}
      />
    </svg>
  );
}

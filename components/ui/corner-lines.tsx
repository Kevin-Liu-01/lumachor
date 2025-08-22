import clsx from "clsx";

const CornerLines = ({ className }: { className?: string }) => (
  <div
    className={clsx("pointer-events-none absolute inset-0 -z-10", className)}
  >
    <svg
      className="absolute bottom-[-2.5rem] left-[-2.5rem] rotate-90"
      width="80"
      height="80"
      viewBox="0 0 80 80"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M80 0V80" stroke="url(#g1)" strokeWidth="2" />
      <path d="M0 80H80" stroke="url(#g1)" strokeWidth="2" />
      <defs>
        <linearGradient
          id="g1"
          x1="80"
          y1="0"
          x2="0"
          y2="80"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="white" stopOpacity="0.2" />
          <stop offset="1" stopColor="white" stopOpacity="0" />
        </linearGradient>
      </defs>
    </svg>
    <svg
      className="absolute top-[-2.5rem] right-[-2.5rem] rotate-90"
      width="80"
      height="80"
      viewBox="0 0 80 80"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M0 80V0" stroke="url(#g2)" strokeWidth="2" />
      <path d="M80 0H0" stroke="url(#g2)" strokeWidth="2" />
      <defs>
        <linearGradient
          id="g2"
          x1="0"
          y1="80"
          x2="80"
          y2="0"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="white" stopOpacity="0.2" />
          <stop offset="1" stopColor="white" stopOpacity="0" />
        </linearGradient>
      </defs>
    </svg>
  </div>
);

export { CornerLines };

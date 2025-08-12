"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { Spinner } from "@/components/ui/spinner";

const buttonVariants = cva(
  "relative inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors " +
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 " +
    "[&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline:
          "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
      },
      shimmer: { true: "overflow-hidden", false: "" },
      loading: { true: "cursor-progress", false: "" },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
      shimmer: false,
      loading: false,
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
  loadingText?: string;
  shimmer?: boolean;
}

function InnerContent({
  shimmer,
  loading,
  loadingText,
  children,
}: Pick<ButtonProps, "shimmer" | "loading" | "loadingText"> & {
  children?: React.ReactNode;
}) {
  return (
    <>
      {shimmer && (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 overflow-hidden"
        >
          <span
            className="absolute inset-y-0 -left-1/2 w-1/2 bg-gradient-to-r from-transparent via-white/20 to-transparent dark:via-white/10"
            style={{ animation: "btn-shimmer 1.25s linear infinite" }}
          />
        </span>
      )}

      {loading ? (
        <>
          <Spinner />
          {loadingText ? (
            <span className="opacity-90">{loadingText}</span>
          ) : null}
        </>
      ) : (
        children
      )}

      {/* keep keyframes local */}
      <style jsx>{`
        @keyframes btn-shimmer {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(200%);
          }
        }
      `}</style>
    </>
  );
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      asChild = false,
      loading = false,
      loadingText,
      shimmer = false,
      children,
      ...props
    },
    ref
  ) => {
    const classes = cn(
      buttonVariants({ variant, size, shimmer, loading }),
      className
    );

    // asChild mode: require exactly one valid React element, clone it, and inject our content
    if (asChild) {
      if (!React.isValidElement(children)) {
        if (process.env.NODE_ENV !== "production") {
          console.warn(
            "[Button] `asChild` expects a single React element child."
          );
        }
        // graceful fallback: render a regular button
        return (
          <button
            className={classes}
            ref={ref}
            disabled={props.disabled || loading}
            aria-busy={loading || undefined}
            {...props}
          >
            <InnerContent
              shimmer={shimmer}
              loading={loading}
              loadingText={loadingText}
            >
              {children}
            </InnerContent>
          </button>
        );
      }

      const child = children as React.ReactElement<any>;
      const childProps: any = {
        ...props,
        className: cn(classes, child.props.className),
        // don't force `disabled` on anchors; use aria + class-based disabling
        "aria-busy": loading || undefined,
        "aria-disabled": (props as any).disabled || loading || undefined,
        // preserve existing onClick etc. (React handles merging)
        ref: ref as unknown as any,
      };

      return React.cloneElement(
        child,
        childProps,
        <InnerContent
          shimmer={shimmer}
          loading={loading}
          loadingText={loadingText}
        >
          {child.props.children}
        </InnerContent>
      );
    }

    // normal button
    return (
      <button
        className={classes}
        ref={ref}
        disabled={props.disabled || loading}
        aria-busy={loading || undefined}
        {...props}
      >
        <InnerContent
          shimmer={shimmer}
          loading={loading}
          loadingText={loadingText}
        >
          {children}
        </InnerContent>
      </button>
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };

// import * as React from 'react';

// import { cn } from '@/lib/utils';

// const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<'input'>>(
//   ({ className, type, ...props }, ref) => {
//     return (
//       <input
//         type={type}
//         className={cn(
//           'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm',
//           className,
//         )}
//         ref={ref}
//         {...props}
//       />
//     );
//   },
// );
// Input.displayName = 'Input';

// export { Input };

'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { ShimmerOverlay } from '@/components/ui/shimmer';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  loading?: boolean;
  shimmer?: boolean;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, loading = false, shimmer = false, ...props }, ref) => {
    return (
      <div className="relative">
        <input
          type={type}
          className={cn(
            'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ' +
              'ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium ' +
              'placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ' +
              'focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
            className,
          )}
          ref={ref}
          disabled={props.disabled || loading}
          aria-busy={loading || shimmer || undefined}
          {...props}
        />
        <ShimmerOverlay show={!!shimmer} rounded="rounded-md" />
      </div>
    );
  },
);
Input.displayName = 'Input';

export { Input };

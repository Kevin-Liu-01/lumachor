// import * as React from 'react';

// import { cn } from '@/lib/utils';

// const Textarea = React.forwardRef<
//   HTMLTextAreaElement,
//   React.ComponentProps<'textarea'>
// >(({ className, ...props }, ref) => {
//   return (
//     <textarea
//       className={cn(
//         'flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm',
//         className,
//       )}
//       ref={ref}
//       {...props}
//     />
//   );
// });
// Textarea.displayName = 'Textarea';

// export { Textarea };
'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { ShimmerOverlay } from '@/components/ui/shimmer';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  loading?: boolean;
  shimmer?: boolean;
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, loading = false, shimmer = false, ...props }, ref) => {
    return (
      <div className="relative">
        <textarea
          className={cn(
            'flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ' +
              'ring-offset-background placeholder:text-muted-foreground ' +
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ' +
              'disabled:cursor-not-allowed disabled:opacity-50',
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
Textarea.displayName = 'Textarea';

export { Textarea };

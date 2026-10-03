import React from 'react';
import * as FocusScopePrimitive from '@radix-ui/react-focus-scope';
import { cn } from '@/lib/utils';

/**
 * FocusScope wrapper for Radix UI modals
 * Ensures focus is trapped within the modal when open
 * This addresses P0 A-02: Focus trap for modals
 */
export function FocusScope({
  className,
  children,
  ...props
}) {
  return (
    <FocusScopePrimitive.Root
      className={cn(className)}
      {...props}
    >
      {children}
    </FocusScopePrimitive.Root>
  );
}

FocusScope.displayName = FocusScopePrimitive.Root.displayName;
import React from 'react';

/**
 * Action bar pinned just above the mobile bottom navigation so the primary
 * action of a long screen stays reachable with the thumb. Hidden from md up,
 * where the in-page action is always visible.
 */
export default function MobileActionBar({ children }) {
  return (
    <div className="fixed inset-x-0 bottom-[54px] z-30 border-t border-border bg-card/95 px-3 py-2 backdrop-blur md:hidden">
      <div className="mx-auto flex w-full max-w-6xl items-center gap-2">{children}</div>
    </div>
  );
}
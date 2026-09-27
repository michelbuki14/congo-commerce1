import React from 'react';

/** Page title block shared by the operations screens. */
export default function OpsHeader({ title, subtitle, children }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-lg font-bold md:text-xl">{title}</h1>
        {subtitle ? <p className="mt-0.5 max-w-2xl text-xs text-muted-foreground">{subtitle}</p> : null}
      </div>
      {children ? <div className="flex flex-wrap items-center gap-2">{children}</div> : null}
    </div>
  );
}
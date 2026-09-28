import React from 'react';

/** Mobile progress indicator: which checkout step the buyer is on. Hidden on desktop, where every step is on one page. */
export default function CheckoutSteps({ steps, current }) {
  return (
    <ol aria-label="Progression de la commande" className="grid grid-cols-3 gap-2 md:hidden">
      {steps.map((label, i) => (
        <li key={label} aria-current={i === current ? 'step' : undefined} className={`flex min-w-0 flex-col gap-2 border-b-2 pb-3 text-xs ${i <= current ? 'border-primary text-primary' : 'border-border text-muted-foreground'}`}>
          <span className={`flex h-7 w-7 items-center justify-center rounded-full font-bold ${i <= current ? 'bg-primary text-primary-foreground' : 'bg-secondary'}`}>{i + 1}</span>
          <span className={i === current ? 'font-bold' : 'font-medium'}>{label}</span>
        </li>
      ))}
    </ol>
  );
}
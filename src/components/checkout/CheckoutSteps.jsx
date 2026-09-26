import React from 'react';

/** Mobile progress indicator: which checkout step the buyer is on. Hidden on desktop, where every step is on one page. */
export default function CheckoutSteps({ steps, current }) {
  return (
    <div className="space-y-2 md:hidden">
      <div className="flex items-center gap-1.5">
        {steps.map((label, i) => (
          <span
            key={label}
            className={`h-1.5 flex-1 rounded-full ${i <= current ? 'bg-primary' : 'bg-secondary'}`}
          />
        ))}
      </div>
      <p className="text-xs font-semibold">
        Étape {current + 1} sur {steps.length}
        <span className="font-normal text-muted-foreground"> · {steps[current]}</span>
      </p>
    </div>
  );
}
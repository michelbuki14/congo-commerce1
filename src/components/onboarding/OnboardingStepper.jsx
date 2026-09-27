import React from 'react';
import { Check } from 'lucide-react';

/** Step indicator for the vendor onboarding form. */
export default function OnboardingStepper({ steps, current }) {
  return (
    <ol className="flex flex-wrap items-center gap-2">
      {steps.map((step, index) => {
        const done = index < current;
        const active = index === current;
        return (
          <li key={step.id} className="flex items-center gap-2">
            <span
              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
                active ? 'bg-primary text-primary-foreground' : done ? 'bg-emerald-100 text-emerald-900' : 'bg-secondary text-muted-foreground'
              }`}
            >
              {done ? <Check className="h-3.5 w-3.5" /> : index + 1}
            </span>
            <span className={`text-[11px] font-semibold ${active ? 'text-foreground' : 'text-muted-foreground'}`}>{step.label}</span>
            {index < steps.length - 1 ? <span className="h-px w-4 bg-border" /> : null}
          </li>
        );
      })}
    </ol>
  );
}
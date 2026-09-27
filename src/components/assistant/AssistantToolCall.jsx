import React, { useState } from 'react';
import { Loader2, Check, AlertTriangle } from 'lucide-react';

const RUNNING = ['pending', 'running', 'in_progress'];
const FAILED = ['failed', 'error'];

function pretty(value) {
  if (value === undefined || value === null) return '';
  if (typeof value !== 'string') return JSON.stringify(value, null, 2);
  try {
    return JSON.stringify(JSON.parse(value), null, 2);
  } catch {
    return value;
  }
}

export default function AssistantToolCall({ toolCall }) {
  const [open, setOpen] = useState(false);
  const status = String(toolCall.status || '').toLowerCase();
  const running = RUNNING.includes(status);
  const rawResults = toolCall.results;
  const failed =
    FAILED.includes(status) ||
    (typeof rawResults === 'string' && /error|failed/i.test(rawResults)) ||
    (rawResults && rawResults.success === false);

  const projection = toolCall.display_projection || {};
  const label = failed
    ? projection.error_label || 'Échec'
    : running
      ? projection.active_label || 'En cours…'
      : projection.label || 'Terminé';
  const detailsHidden = projection.hide_details && projection.details_redacted;
  const Icon = running ? Loader2 : failed ? AlertTriangle : Check;

  return (
    <div className="rounded-xl border border-border bg-secondary/60 px-2.5 py-1.5 text-[11px]">
      <button
        type="button"
        onClick={() => !detailsHidden && setOpen(!open)}
        className="flex w-full items-center gap-1.5 text-left"
      >
        <Icon className={`h-3 w-3 shrink-0 ${running ? 'animate-spin' : ''} ${failed ? 'text-destructive' : ''}`} />
        <span className="font-semibold">{String(toolCall.name || 'outil').replace(/_/g, ' ')}</span>
        <span className="text-muted-foreground">{label}</span>
      </button>
      {open && !detailsHidden && (
        <div className="mt-1.5 space-y-1.5">
          {toolCall.arguments_string && (
            <div>
              <p className="font-semibold text-muted-foreground">Paramètres</p>
              <pre className="overflow-x-auto whitespace-pre-wrap break-words">{pretty(toolCall.arguments_string)}</pre>
            </div>
          )}
          {rawResults !== undefined && rawResults !== null && (
            <div>
              <p className="font-semibold text-muted-foreground">Résultat</p>
              <pre className="max-h-40 overflow-auto whitespace-pre-wrap break-words">{pretty(rawResults)}</pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
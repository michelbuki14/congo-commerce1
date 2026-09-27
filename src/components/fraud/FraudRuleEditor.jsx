import React from 'react';
import { Save } from 'lucide-react';

export default function FraudRuleEditor({ rules, drafts, savingId, onDraft, onSave }) {
  return (
    <div className="space-y-2">
      {rules.map((rule) => {
        const draft = drafts[rule.id] || {};
        const value = { threshold: draft.threshold ?? String(rule.threshold), score: draft.score ?? String(rule.score), action: draft.action ?? rule.action };
        const dirty = value.threshold !== String(rule.threshold) || value.score !== String(rule.score) || value.action !== rule.action;
        return (
          <div key={rule.id} className="rounded-xl border border-border bg-card p-3.5">
            <div className="flex flex-wrap items-start gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">{rule.label}</p>
                <p className="text-[11px] text-muted-foreground">{rule.description || rule.code}</p>
              </div>
              <label className="flex items-center gap-1.5 text-[11px] font-semibold">
                <input
                  type="checkbox"
                  checked={rule.active !== false}
                  onChange={(e) => onSave({ ...rule, active: e.target.checked })}
                  className="h-4 w-4"
                />
                Active
              </label>
            </div>

            <div className="mt-2.5 flex flex-wrap items-end gap-2">
              <label className="text-[11px] font-semibold">
                Seuil
                <input
                  type="number"
                  min="0"
                  value={value.threshold}
                  onChange={(e) => onDraft(rule.id, { ...value, threshold: e.target.value })}
                  className="mt-0.5 block h-8 w-20 rounded-lg border border-border bg-background px-2 text-sm"
                />
              </label>
              <label className="text-[11px] font-semibold">
                Points
                <input
                  type="number"
                  min="0"
                  value={value.score}
                  onChange={(e) => onDraft(rule.id, { ...value, score: e.target.value })}
                  className="mt-0.5 block h-8 w-20 rounded-lg border border-border bg-background px-2 text-sm"
                />
              </label>
              <label className="text-[11px] font-semibold">
                Recommandation
                <select
                  value={value.action}
                  onChange={(e) => onDraft(rule.id, { ...value, action: e.target.value })}
                  className="mt-0.5 block h-8 rounded-lg border border-border bg-background px-2 text-sm"
                >
                  <option value="review">Examen manuel</option>
                  <option value="block">Blocage recommandé</option>
                </select>
              </label>
              <button
                type="button"
                disabled={!dirty || savingId === rule.id}
                onClick={() => onSave({ ...rule, threshold: Number(value.threshold) || 0, score: Number(value.score) || 0, action: value.action })}
                className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground disabled:opacity-40"
              >
                <Save className="h-3.5 w-3.5" /> {savingId === rule.id ? '…' : 'Enregistrer'}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
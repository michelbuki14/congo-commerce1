import React, { useState } from 'react';
import { Code2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { DEV_SECTIONS } from '@/lib/devDocs';

export default function DeveloperPortal() {
  const { t } = useTranslation();
  const [tab, setTab] = useState(DEV_SECTIONS[0].id);
  const section = DEV_SECTIONS.find((s) => s.id === tab);
  return (
    <div className="mx-auto max-w-4xl space-y-5 px-3 py-6 md:px-6">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary text-primary-foreground"><Code2 className="h-5 w-5" /></div>
        <div>
          <h1 className="text-xl font-bold">{t('developerPortal.title')}</h1>
          <p className="text-sm text-muted-foreground">{t('developerPortal.subtitle')}</p>
        </div>
      </div>
      <nav className="-mx-3 flex gap-2 overflow-x-auto px-3">
        {DEV_SECTIONS.map((s) => (
          <button key={s.id} type="button" onClick={() => setTab(s.id)} className={`shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-semibold ${tab === s.id ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-card'}`}>{s.title}</button>
        ))}
      </nav>
      <div className="space-y-3">
        {section.blocks.map((b) => (
          <section key={b.h} className="rounded-2xl border border-border bg-card p-4">
            <h2 className="text-sm font-bold">{b.h}</h2>
            {b.p && <p className="mt-1 text-sm text-muted-foreground">{b.p}</p>}
            {b.code && <pre className="mt-2 overflow-x-auto rounded-xl bg-primary p-3 font-mono text-xs text-primary-foreground">{b.code}</pre>}
          </section>
        ))}
      </div>
    </div>
  );
}
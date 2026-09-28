import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { base44 } from '@/api/base44Client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export default function ContactForm({ user, onSaved }) {
  const { t } = useTranslation();
  const [f, setF] = useState({ phone: user.phone || '', city: user.city || '', address: user.address || '' });
  const [state, setState] = useState('');
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setState('saving');
    try {
      await base44.auth.updateMe(f);
      setState('saved');
      onSaved?.();
    } catch (err) {
      setState(err.message || t('contactForm.errorFallback'));
    }
  };

  return (
    <form onSubmit={submit} className="grid gap-2 md:grid-cols-2">
      <Input value={user.full_name || ''} disabled aria-label={t('contactForm.nameLabel')} />
      <Input value={user.email} disabled aria-label={t('contactForm.emailLabel')} />
      <Input placeholder={t('contactForm.phonePh')} value={f.phone} onChange={set('phone')} />
      <Input placeholder={t('contactForm.cityPh')} value={f.city} onChange={set('city')} />
      <Input className="md:col-span-2" placeholder={t('contactForm.addressPh')} value={f.address} onChange={set('address')} />
      <div className="flex items-center gap-3 md:col-span-2">
        <Button type="submit" disabled={state === 'saving'}>{state === 'saving' ? t('contactForm.saving') : t('contactForm.save')}</Button>
        {state === 'saved' && <span className="text-xs text-emerald-700">{t('contactForm.saved')}</span>}
        {state && !['saving', 'saved'].includes(state) && <span className="text-xs text-destructive">{state}</span>}
      </div>
    </form>
  );
}

import React from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { DRC_NETWORKS, validateMobileMoneyNumber } from '@/lib/mobileMoney';

const mobileMoneySchema = z.object({
  provider: z.string().min(1, 'payout.errProviderRequired'),
  phone: z.string().min(1, 'payout.errPhoneRequired').refine(
    (val) => {
      const phone = validateMobileMoneyNumber(val, val);
      return phone.ok;
    },
    'payout.errPhoneInvalid'
  ),
  holder: z.string().min(1, 'payout.errHolderRequired'),
});

export default function MobileMoneyForm({ onAdd }) {
  const { t } = useTranslation();
  const { register, handleSubmit, reset, formState: { errors, isSubmitting }, setError, clearErrors } = useForm({
    resolver: zodResolver(mobileMoneySchema),
    defaultValues: { provider: 'mpesa', phone: '', holder: '' },
  });

  const submit = async (formData) => {
    clearErrors();
    const check = validateMobileMoneyNumber(formData.provider, formData.phone);
    if (!check.ok) {
      setError('phone', { type: 'manual', message: t('payout.errPhoneInvalid') });
      return;
    }
    await onAdd({ provider: formData.provider, phone: check.phone, holder: formData.holder });
    reset({ provider: 'mpesa', phone: '', holder: '' });
  };

  return (
    <form onSubmit={handleSubmit(submit)} className="grid gap-2 md:grid-cols-3">
      <select {...register('provider')} className="h-9 rounded-md border border-input bg-card px-3 text-sm">
        {DRC_NETWORKS.map((n) => <option key={n.providerId} value={n.providerId}>{n.name}</option>)}
      </select>
      <Input placeholder={t('payout.phoneNumber')} {...register('phone')} inputMode="tel" />
      <Input placeholder={t('payout.holderName')} {...register('holder')} />
      {errors.provider && <p className="text-[11px] text-destructive md:col-span-3">{t(errors.provider.message)}</p>}
      {errors.phone && <p className="text-[11px] text-destructive md:col-span-3">{t(errors.phone.message)}</p>}
      {errors.holder && <p className="text-[11px] text-destructive md:col-span-3">{t(errors.holder.message)}</p>}
      <Button type="submit" className="md:col-span-3" disabled={isSubmitting}>{isSubmitting ? t('payout.saving', 'Saving...') : t('payout.addAccount')}</Button>
    </form>
  );
}

import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { MapPin, Star, Trash2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import InfoPage, { InfoSection } from '@/components/InfoPage';
import AddressForm from '@/components/settings/AddressForm';
import useUserPrefs from '@/lib/useUserPrefs';

export default function SavedAddresses() {
  const { t } = useTranslation();
  const { value: list, save } = useUserPrefs('saved_addresses', []);
  const [points, setPoints] = useState([]);

  useEffect(() => { base44.entities.PickupPoint.list('name', 100).then(setPoints).catch(() => setPoints([])); }, []);

  if (!list) return <div className="mx-auto h-64 max-w-3xl animate-pulse rounded-2xl bg-secondary" />;

  const add = (a) => save([...list, { ...a, is_default: list.length === 0 }]);
  const remove = (id) => save(list.filter((a) => a.id !== id));
  const makeDefault = (id) => save(list.map((a) => ({ ...a, is_default: a.id === id })));

  return (
    <InfoPage icon={MapPin} title={t('savedAddresses.title')} subtitle={t('savedAddresses.subtitle')}>
      <InfoSection title={t('savedAddresses.newAddress')}>
        <AddressForm pickupPoints={points} onAdd={add} />
      </InfoSection>
      <InfoSection title={t('savedAddresses.myAddresses', { count: list.length })}>
        {list.length === 0 && <p>{t('savedAddresses.noAddress')}</p>}
        {list.map((a) => (
          <div key={a.id} className="flex items-start justify-between gap-3 rounded-xl border border-border p-3">
            <div>
              <p className="text-sm font-semibold text-foreground">
                {a.label} {a.is_default && <span className="ml-1 rounded-full bg-primary px-2 py-0.5 text-[10px] text-primary-foreground">{t('savedAddresses.defaultBadge')}</span>}
              </p>
              <p>{a.type === 'pickup' ? t('savedAddresses.pickupPointIs', { name: a.pickup_point_name }) : `${a.address}, ${a.city}`}</p>
              {a.phone && <p>{a.phone}</p>}
            </div>
            <div className="flex gap-1">
              {!a.is_default && (
                <button type="button" aria-label={t('savedAddresses.setDefault')} onClick={() => makeDefault(a.id)} className="rounded-full p-2 hover:bg-secondary"><Star className="h-4 w-4" /></button>
              )}
              <button type="button" aria-label={t('savedAddresses.delete')} onClick={() => remove(a.id)} className="rounded-full p-2 hover:bg-secondary"><Trash2 className="h-4 w-4" /></button>
            </div>
          </div>
        ))}
      </InfoSection>
    </InfoPage>
  );
}

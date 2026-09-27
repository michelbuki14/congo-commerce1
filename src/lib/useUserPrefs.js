import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';

/** Reads and saves one preference object stored on the signed-in user. */
export default function useUserPrefs(key, defaults) {
  const [value, setValue] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    base44.auth.me().then((u) => setValue(u?.[key] ?? defaults));
  }, [key]);

  const save = async (next) => {
    setValue(next);
    setSaving(true);
    await base44.auth.updateMe({ [key]: next });
    setSaving(false);
  };

  return { value, save, saving };
}
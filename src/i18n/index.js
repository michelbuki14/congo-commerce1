import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import fr from './fr';
import en from './en';
import ln from './ln';
import sw from './sw';
import intlShipment from './intlShipment';

export const LANGUAGES = [
  { id: 'fr', label: 'FR', name: 'Français' },
  { id: 'en', label: 'EN', name: 'English' },
  { id: 'ln', label: 'LN', name: 'Lingala' },
  { id: 'sw', label: 'SW', name: 'Kiswahili' },
];

const STORAGE_KEY = 'cc:lang';

function initialLanguage() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && LANGUAGES.some((l) => l.id === saved)) return saved;
    const nav = String(navigator.language || '').slice(0, 2).toLowerCase();
    if (LANGUAGES.some((l) => l.id === nav)) return nav;
  } catch {
    // private mode / SSR — fall through to French
  }
  return 'fr';
}

const mergeNamespaces = (base, extra) =>
  Object.entries(extra).reduce((out, [ns, values]) => ({ ...out, [ns]: { ...(out[ns] || {}), ...values } }), { ...base });

i18n.use(initReactI18next).init({
  resources: {
    fr: { translation: mergeNamespaces(fr, intlShipment.fr) },
    en: { translation: mergeNamespaces(en, intlShipment.en) },
    ln: { translation: mergeNamespaces(ln, intlShipment.fr) },
    sw: { translation: mergeNamespaces(sw, intlShipment.fr) },
  },
  lng: initialLanguage(),
  fallbackLng: 'fr',
  interpolation: { escapeValue: false },
});

if (typeof document !== 'undefined') {
  document.documentElement.lang = i18n.language;
  i18n.on('languageChanged', (lng) => {
    document.documentElement.lang = lng;
    try {
      localStorage.setItem(STORAGE_KEY, lng);
    } catch {
      // ignore persistence failures
    }
  });
}

export function setLanguage(id) {
  if (LANGUAGES.some((l) => l.id === id)) i18n.changeLanguage(id);
}

export default i18n;
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from '../i18n/en.json';
import ta from '../i18n/ta.json';
import hi from '../i18n/hi.json';
import te from '../i18n/te.json';
import ml from '../i18n/ml.json';

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    ta: { translation: ta },
    hi: { translation: hi },
    te: { translation: te },
    ml: { translation: ml },
  },
  lng: 'en',
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});

// Keep the document's lang attribute in sync with the active language so
// screen readers announce content with the correct pronunciation/voice,
// and so the static index.html's lang="en" doesn't lie once a user picks
// Tamil/Hindi/etc. Runs on init and on every subsequent switch.
function syncDocumentLang(lng: string) {
  if (typeof document !== 'undefined') {
    document.documentElement.lang = lng;
  }
}
syncDocumentLang(i18n.language);
i18n.on('languageChanged', syncDocumentLang);

export default i18n;

// src/i18n.js
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import HttpBackend from 'i18next-http-backend';
import LanguageDetector from 'i18next-browser-languagedetector';

i18n
  // Backend'i yükle (JSON dosyalarını public/locales'den çeker)
  .use(HttpBackend)
  // Dil algılama
  .use(LanguageDetector)
  // react-i18next'i bağla
  .use(initReactI18next)
  // Konfigürasyon
  .init({
    fallbackLng: 'tr', // Varsayılan dil Türkçe
    debug: false, // Geliştirme sırasında true yapabilirsiniz
    
    // Dil algılama sırası
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: 'vocalize_language',
    },

    // Backend ayarları
    backend: {
      loadPath: '/locales/{{lng}}/translation.json',
    },

    // İnterpolasyon ayarları
    interpolation: {
      escapeValue: false, // React zaten XSS koruması sağlıyor
    },

    // Desteklenen diller
    supportedLngs: ['tr', 'en'],
    
    // Namespace
    ns: ['translation'],
    defaultNS: 'translation',

    react: {
      useSuspense: true, // Loading fallback için
    }
  });

export default i18n;
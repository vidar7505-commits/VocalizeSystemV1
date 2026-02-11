import React, { Suspense } from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

// 🟣 KATMAN 0: i18n Konfigürasyonu (EN ÜST SEVIYE - ilk import)
import './i18n'

// 🔴 KATMAN 1: Global Error Boundary (zaten var, değiştirme)
import GlobalErrorBoundary from '@/components/GlobalErrorBoundary'

// 🟢 KATMAN 2: Auth State Wrapper (YENİ - session senkronizasyonu)
import AuthStateWrapper from '@/components/AuthStateWrapper'

// 🟡 KATMAN 1.25: Helmet Provider for SEO (react-helmet-async)
import { HelmetProvider } from 'react-helmet-async'

// 🔵 i18n Loading Fallback Component
const I18nLoadingFallback = () => (
  <div className="flex items-center justify-center min-h-screen bg-slate-900">
    <div className="text-center">
      <div className="w-16 h-16 border-4 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
      <p className="text-slate-400 text-sm font-medium">Dil dosyaları yükleniyor...</p>
    </div>
  </div>
);

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {/* 🔴 KATMAN 1: Global hata yakalama */}
    <GlobalErrorBoundary>
      {/* 🟡 KATMAN 1.25: SEO/Helmet Provider */}
      <HelmetProvider>
        {/* 🔵 KATMAN 1.5: i18n Suspense wrapper (dil dosyaları yüklenene kadar bekle) */}
        <Suspense fallback={<I18nLoadingFallback />}>
          {/* 🟢 KATMAN 2: Auth session hazır olana kadar bekle */}
          <AuthStateWrapper>
            <App />
          </AuthStateWrapper>
        </Suspense>
      </HelmetProvider>
    </GlobalErrorBoundary>
  </React.StrictMode>,
)
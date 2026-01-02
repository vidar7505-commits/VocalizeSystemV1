import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

// 🔴 KATMAN 1: Global Error Boundary (zaten var, değiştirme)
import GlobalErrorBoundary from '@/components/GlobalErrorBoundary'

// 🟢 KATMAN 2: Auth State Wrapper (YENİ - session senkronizasyonu)
import AuthStateWrapper from '@/components/AuthStateWrapper'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {/* 🔴 KATMAN 1: Global hata yakalama */}
    <GlobalErrorBoundary>
      {/* 🟢 KATMAN 2: Auth session hazır olana kadar bekle */}
      <AuthStateWrapper>
        <App />
      </AuthStateWrapper>
    </GlobalErrorBoundary>
  </React.StrictMode>,
)
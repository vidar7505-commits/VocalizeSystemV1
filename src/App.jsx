import React, { Suspense, lazy, useEffect } from 'react'; // Suspense, lazy ve useEffect eklendi
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import ProtectedRoute from '@/components/ProtectedRoute';
import { AuthProvider, useAuth } from '@/contexts/SupabaseAuthContext';
import { Toaster } from '@/components/ui/toaster';
import AdminLayout from '@/layouts/AdminLayout';
import { AnimatePresence, motion } from 'framer-motion';

// Lazy loading for pages
const LandingPage = lazy(() => import('@/pages/LandingPage'));
const CustomerPanel = lazy(() => import('@/pages/CustomerPanel'));
const AdminPanel = lazy(() => import('@/pages/AdminPanel'));
const FeedbackManagement = lazy(() => import('@/pages/FeedbackManagement'));
const DetailedAnalytics = lazy(() => import('@/pages/DetailedAnalytics'));
const SettingsPage = lazy(() => import('@/pages/SettingsPage'));
const FeedbackForm = lazy(() => import('@/pages/FeedbackForm'));
const QRRedirector = lazy(() => import('@/pages/QRRedirector'));
const NotificationHistory = lazy(() => import('@/pages/NotificationHistory'));
const CustomerDetail = lazy(() => import('@/pages/CustomerDetail'));
const UpdatePassword = lazy(() => import('@/pages/UpdatePassword'));
const ErrorTestPage = lazy(() => import('@/pages/ErrorTestPage'));
const BulkSetupWizard = lazy(() => import('@/pages/BulkSetupWizard'));

// Loading component
// Loading component
// Loading component (Animasyonlu)
const PageLoader = React.forwardRef((props, ref) => (
  <motion.div
    ref={ref}
    initial={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    transition={{ duration: 0.5, ease: "easeInOut" }}
    className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#0f172a] text-white"
  >
    <div className="relative flex flex-col items-center">
      {/* Logo Container with Glow */}
      <div className="relative w-32 h-32 md:w-40 md:h-40 mb-8 flex items-center justify-center animate-pulse">
        {/* Background Glows */}
        <div className="absolute inset-0 bg-teal-500/20 rounded-full blur-3xl" />
        <div className="absolute inset-0 bg-orange-500/10 rounded-full blur-2xl delays-75" />
        <img
          src="/faviconmain.png"
          alt="Vocalize Logo"
          className="w-full h-full object-contain relative z-10 drop-shadow-2xl"
        />
      </div>
      {/* Loading Bar */}
      <div className="h-1 w-48 bg-slate-800 rounded-full overflow-hidden relative">
        <div
          className="absolute inset-y-0 left-0 bg-gradient-to-r from-teal-500 to-orange-500 w-1/2"
          style={{ animation: 'shimmer 1.5s infinite linear' }}
        />
      </div>
      <p className="mt-4 text-slate-400 text-sm font-medium tracking-widest uppercase animate-pulse">
        Yükleniyor...
      </p>
      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(200%); }
        }
      `}</style>
    </div>
  </motion.div>
));
PageLoader.displayName = "PageLoader";

// 👇 YENİ BİLEŞEN: Tema Kontrolcüsü
// Bu bileşen sayfa her değiştiğinde çalışır ve temayı ayarlar.
const ThemeController = () => {
  const location = useLocation();

  useEffect(() => {
    // Eğer bulunduğumuz sayfa '/admin-panel' ile başlıyorsa (Yönetici Paneli içindeysek)
    if (location.pathname.startsWith('/admin-panel')) {
      // Kullanıcının kaydettiği tercihi hatırla ve uygula
      const savedTheme = localStorage.getItem('acta_theme');
      if (savedTheme === 'light') {
        document.body.classList.add('light-theme');
      } else {
        document.body.classList.remove('light-theme');
      }
    }
    // Eğer Yönetici Paneli DIŞINDAYSAK (Landing, Feedback Form, Login vb.)
    else {
      // Aydınlık temayı ZORLA KAPAT (Orijinal koyu temaya dön)
      document.body.classList.remove('light-theme');
    }
  }, [location]); // Her URL değişiminde tetiklenir

  return null; // Görüntülenecek bir şeyi yok, sadece mantık çalıştırır.
};

// 👇 Yeni Bileşen: Auth Loading Wrapper
// AuthContext'teki loading durumuna göre PageLoader'ı gösterir
const AuthLoadingWrapper = ({ children }) => {
  const { loading } = useAuth();

  return (
    <>
      <AnimatePresence>
        {loading && <PageLoader />}
      </AnimatePresence>
      {children}
    </>
  );
};

function App() {
  return (
    <AuthProvider>
      <Router>
        {/* 👇 ThemeController Router'ın içine eklendi */}
        <ThemeController />

        <AuthLoadingWrapper>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/" element={<LandingPage />} />

              <Route path="/scan" element={<QRRedirector />} />

              <Route path="/feedback" element={<FeedbackForm />} />

              <Route path="/update-password" element={<UpdatePassword />} />

              <Route path="/error-test" element={<ErrorTestPage />} />

              <Route element={<ProtectedRoute allowedRole="customer" />}>
                <Route path="/customer-panel" element={<CustomerPanel />} />
              </Route>

              <Route element={<ProtectedRoute allowedRole="manager" />}>
                <Route path="/admin-panel" element={<AdminLayout />}>
                  <Route index element={<AdminPanel />} />
                  <Route path="feedbacks" element={<FeedbackManagement />} />
                  <Route path="analytics" element={<DetailedAnalytics />} />
                  <Route path="settings" element={<SettingsPage />} />
                  <Route path="notifications" element={<NotificationHistory />} />
                  <Route path="customers/:id" element={<CustomerDetail />} />
                  <Route path="bulk-setup" element={<BulkSetupWizard />} />
                </Route>
              </Route>
            </Routes>
          </Suspense>
        </AuthLoadingWrapper>
        <Toaster />
      </Router>
    </AuthProvider>
  );
}

export default App;
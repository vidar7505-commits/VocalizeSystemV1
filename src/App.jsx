import React, { useEffect, lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { AuthProvider } from '@/contexts/SupabaseAuthContext';
import { Toaster } from '@/components/ui/toaster';
import { Loader2 } from 'lucide-react';

// 🚀 PERFORMANCE: Lazy load all routes to reduce initial bundle size
const LandingPage = lazy(() => import('@/pages/LandingPage'));
const CustomerPanel = lazy(() => import('@/pages/CustomerPanel'));
const AdminPanel = lazy(() => import('@/pages/AdminPanel'));
const FeedbackManagement = lazy(() => import('@/pages/FeedbackManagement'));
const DetailedAnalytics = lazy(() => import('@/pages/DetailedAnalytics'));
const SettingsPage = lazy(() => import('@/pages/SettingsPage'));
const FeedbackForm = lazy(() => import('@/pages/FeedbackForm'));
const QRRedirector = lazy(() => import('@/pages/QRRedirector'));
const ProtectedRoute = lazy(() => import('@/components/ProtectedRoute'));
const AdminLayout = lazy(() => import('@/layouts/AdminLayout'));
const NotificationHistory = lazy(() => import('@/pages/NotificationHistory'));
const CustomerDetail = lazy(() => import('@/pages/CustomerDetail'));
const UpdatePassword = lazy(() => import('@/pages/UpdatePassword'));

// Loading Screen Component
const LoadingScreen = () => (
  <div className="min-h-screen flex items-center justify-center bg-[#0f172a]">
    <div className="flex flex-col items-center animate-in fade-in duration-500">
      <Loader2 className="h-12 w-12 md:h-16 md:w-16 text-teal-500 animate-spin mb-6" />
      <p className="text-slate-400 text-base md:text-lg font-medium text-center">Yükleniyor...</p>
    </div>
  </div>
);

// Theme Controller
const ThemeController = () => {
  const location = useLocation();

  useEffect(() => {
    if (location.pathname.startsWith('/admin-panel')) {
      const savedTheme = localStorage.getItem('acta_theme');
      if (savedTheme === 'light') {
        document.body.classList.add('light-theme');
      } else {
        document.body.classList.remove('light-theme');
      }
    } else {
      document.body.classList.remove('light-theme');
    }
  }, [location]);

  return null;
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <ThemeController />

        <Suspense fallback={<LoadingScreen />}>
          <Routes>
            <Route path="/" element={<LandingPage />} />

            <Route path="/scan" element={<QRRedirector />} />

            <Route path="/feedback" element={<FeedbackForm />} />

            <Route path="/update-password" element={<UpdatePassword />} />

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
              </Route>
            </Route>
          </Routes>
        </Suspense>

        <Toaster />
      </Router>
    </AuthProvider>
  );
}

export default App;
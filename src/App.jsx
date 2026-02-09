import React, { useEffect } from 'react'; // useEffect eklendi
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom'; // useLocation eklendi
import LandingPage from '@/pages/LandingPage';
import CustomerPanel from '@/pages/CustomerPanel';
import AdminPanel from '@/pages/AdminPanel';
import FeedbackManagement from '@/pages/FeedbackManagement';
import DetailedAnalytics from '@/pages/DetailedAnalytics';
import SettingsPage from '@/pages/SettingsPage';
import FeedbackForm from '@/pages/FeedbackForm';
import QRRedirector from '@/pages/QRRedirector';
import ProtectedRoute from '@/components/ProtectedRoute';
import { AuthProvider } from '@/contexts/SupabaseAuthContext';
import { Toaster } from '@/components/ui/toaster';
import AdminLayout from '@/layouts/AdminLayout';
import NotificationHistory from '@/pages/NotificationHistory';
import CustomerDetail from '@/pages/CustomerDetail';
import UpdatePassword from '@/pages/UpdatePassword';

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

function App() {
  return (
    <AuthProvider>
      <Router>
        {/* 👇 ThemeController Router'ın içine eklendi */}
        <ThemeController />

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
        <Toaster />
      </Router>
    </AuthProvider>
  );
}

export default App;
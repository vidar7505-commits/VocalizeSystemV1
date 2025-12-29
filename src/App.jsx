import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
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
// 👇 YENİ EKLENEN IMPORT
import UpdatePassword from '@/pages/UpdatePassword';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          
          <Route path="/scan" element={<QRRedirector />} />
          
          <Route path="/feedback" element={<FeedbackForm />} />

          {/* 👇 YENİ EKLENEN ROTA: Şifre Sıfırlama Sayfası */}
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
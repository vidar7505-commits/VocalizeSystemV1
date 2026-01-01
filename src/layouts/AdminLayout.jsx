import React from 'react';
import { Outlet } from 'react-router-dom';
import { AdminProvider } from '@/contexts/AdminContext';
import AdminHeader from '@/components/AdminHeader';
import AdminSidebar from '@/components/AdminSidebar';
import AdminMobileNavbar from '@/components/AdminMobileNavbar';

const AdminLayout = () => {
  return (
    <AdminProvider>
      {/* DÜZELTME: 'min-h-screen' yerine 'h-screen' ve 'overflow-hidden' kullanıldı.
        Bu, sidebar'ın ve içeriğin birbirinden bağımsız scroll edilmesini sağlar.
        Böylece içerik uzasa bile Sidebar sabit kalır.
      */}
      <div className="h-screen w-full bg-[#0f172a] flex font-sans text-slate-100 overflow-hidden">
        <AdminSidebar />
        
        <div className="flex-1 flex flex-col min-w-0 h-full">
          <AdminHeader />
          <AdminMobileNavbar />
          
          {/* DÜZELTME: main alanı artık kapsayıcının kalan yüksekliğini doldurur 
             ve sadece kendi içinde scroll olur. 
          */}
          <main className="flex-1 overflow-y-auto p-4 md:p-8 bg-slate-900/50 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
            <Outlet />
          </main>
        </div>
      </div>
    </AdminProvider>
  );
};

export default AdminLayout;
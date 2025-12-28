import React from 'react';
import { Outlet } from 'react-router-dom';
import { AdminProvider } from '@/contexts/AdminContext';
import AdminHeader from '@/components/AdminHeader';
import AdminSidebar from '@/components/AdminSidebar';

const AdminLayout = () => {
  return (
    <AdminProvider>
      <div className="min-h-screen bg-[#0f172a] flex font-sans text-slate-100">
        <AdminSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <AdminHeader />
          <main className="flex-1 overflow-y-auto p-4 md:p-8 bg-slate-900/50">
            <Outlet />
          </main>
        </div>
      </div>
    </AdminProvider>
  );
};

export default AdminLayout;
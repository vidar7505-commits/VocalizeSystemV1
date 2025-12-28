import React, { useState } from 'react';
import { useAdminContext } from '@/contexts/AdminContext'; // Mevcut context'i kullanıyoruz
import { 
  MessageSquare, Star, AlertTriangle, CheckCircle2, Menu, Calendar, ChevronRight, User 
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';

// Basit Mobil Kart Bileşeni
const MobileStatCard = ({ title, value, icon: Icon, color }) => (
  <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between shadow-sm">
    <div>
      <p className="text-slate-400 text-xs font-medium uppercase">{title}</p>
      <h3 className="text-2xl font-bold text-white mt-1">{value}</h3>
    </div>
    <div className={`p-3 rounded-full ${color} bg-opacity-20`}>
      <Icon className={`w-5 h-5 ${color.replace('bg-', 'text-')}`} />
    </div>
  </div>
);

export default function MobileAdminDashboard() {
  const { 
    branches, 
    selectedBranchId, 
    setSelectedBranchId, 
    dateRange, 
    setDateRange,
    stats,         // AdminContext'ten gelen veriler (Eğer stats yoksa burayı kendi yapına göre düzelt)
    recentFeedbacks // AdminContext'ten gelen son bildirimler
  } = useAdminContext();

  // Eğer Context'ten veri gelmiyorsa güvenli mod (Hata vermemesi için)
  const safeStats = stats || { total: 0, complaints: 0, resolved: 0, rating: 0 };
  const safeFeedbacks = recentFeedbacks || [];

  return (
    <div className="min-h-screen bg-slate-950 text-white pb-20 overflow-x-hidden w-full">
      {/* --- HEADER --- */}
      <header className="sticky top-0 z-50 bg-slate-900/80 backdrop-blur-md border-b border-slate-800 px-4 py-3 flex justify-between items-center">
        <h1 className="text-lg font-bold bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent">
          Vocalize Panel
        </h1>
        {/* Şube Seçimi Mobilde Header'da */}
        <Select value={selectedBranchId} onValueChange={setSelectedBranchId}>
          <SelectTrigger className="w-[140px] h-8 text-xs bg-slate-800 border-slate-700">
            <SelectValue placeholder="Şube Seç" />
          </SelectTrigger>
          <SelectContent className="bg-slate-800 border-slate-700 text-white">
            <SelectItem value="all">Tüm Şubeler</SelectItem>
            {branches?.map(b => (
              <SelectItem key={b.id} value={b.id}>{b.branch_name_tr}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </header>

      {/* --- CONTENT --- */}
      <main className="p-4 space-y-6 w-full max-w-[100vw]">
        
        {/* Tarih Filtresi */}
        <div className="flex justify-end">
           <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-full sm:w-[150px] bg-slate-900 border-slate-800">
              <Calendar className="w-4 h-4 mr-2 text-slate-400" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-slate-900 border-slate-800">
              <SelectItem value="Bugün">Bugün</SelectItem>
              <SelectItem value="Son 7 Gün">Son 7 Gün</SelectItem>
              <SelectItem value="Bu Ay">Bu Ay</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* İstatistik Kartları (Grid yerine Flex column mobilde daha güvenli olabilir ama Grid 2 col iyidir) */}
        <div className="grid grid-cols-2 gap-3">
          <MobileStatCard title="Toplam" value={safeStats.total || 0} icon={MessageSquare} color="text-blue-500 bg-blue-500" />
          <MobileStatCard title="Şikayet" value={safeStats.complaints || 0} icon={AlertTriangle} color="text-red-500 bg-red-500" />
          <MobileStatCard title="Çözülen" value={safeStats.resolved || 0} icon={CheckCircle2} color="text-green-500 bg-green-500" />
          <MobileStatCard title="Puan" value={safeStats.rating || '0.0'} icon={Star} color="text-yellow-500 bg-yellow-500" />
        </div>

        {/* Son Aktiviteler Listesi */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold flex items-center gap-2">
            Son Bildirimler
            <Badge variant="outline" className="ml-auto text-xs font-normal border-slate-700">{safeFeedbacks.length} Yeni</Badge>
          </h2>

          <div className="space-y-3">
            {safeFeedbacks.length === 0 ? (
              <div className="text-center py-10 text-slate-500 text-sm">Henüz veri yok.</div>
            ) : (
              safeFeedbacks.map((item) => (
                <div key={item.id} className="bg-slate-900 border border-slate-800 p-4 rounded-xl active:scale-[0.98] transition-transform">
                  <div className="flex justify-between items-start mb-2">
                    <Badge className={`
                      ${item.feedback_type === 'complaint' ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20' : 
                        item.feedback_type === 'suggestion' ? 'bg-blue-500/10 text-blue-400 hover:bg-blue-500/20' : 
                        'bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500/20'} border-0
                    `}>
                      {item.feedback_type === 'complaint' ? 'Şikayet' : item.feedback_type === 'suggestion' ? 'Öneri' : 'Değerlendirme'}
                    </Badge>
                    <span className="text-xs text-slate-500">
                      {format(new Date(item.created_at), 'd MMM HH:mm', { locale: tr })}
                    </span>
                  </div>
                  
                  <p className="text-sm text-slate-300 line-clamp-2 mb-3">
                    {item.message || "Mesaj içeriği yok..."}
                  </p>

                  <div className="flex items-center justify-between border-t border-slate-800 pt-3 mt-2">
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                      <User className="w-3 h-3" />
                      <span className="truncate max-w-[100px]">{item.customer_name || 'Anonim'}</span>
                    </div>
                    <Button variant="ghost" size="sm" className="h-6 text-xs text-indigo-400 hover:text-indigo-300 p-0">
                      Detay <ChevronRight className="w-3 h-3 ml-1" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
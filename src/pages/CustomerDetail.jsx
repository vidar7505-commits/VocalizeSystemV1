import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/customSupabaseClient';
import { ArrowLeft, User, Mail, Phone, Calendar, Star, MessageSquare, AlertTriangle, MapPin, Loader2, Edit } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import CustomerProfileModal from '@/components/CustomerProfileModal';

const CustomerDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [profile, setProfile] = useState(null);
  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // 🟢 EDIT MODAL
  const [editModalOpen, setEditModalOpen] = useState(false);

  useEffect(() => {
    const fetchCustomerData = async () => {
      setLoading(true);
      try {
        // 🟢 PROMISE.ALL ile paralel fetch
        const [profileRes, feedbackRes] = await Promise.all([
          supabase
            .from('customer_profiles')
            .select('*')
            .eq('id', id)
            .single(),
          supabase
            .from('feedbacks')
            .select('*, branches(branch_name_tr)')
            .eq('customer_profile_id', id)
            .order('created_at', { ascending: false })
        ]);

        if (profileRes.error) throw profileRes.error;
        setProfile(profileRes.data);

        if (feedbackRes.error) throw feedbackRes.error;
        setFeedbacks(feedbackRes.data || []);

      } catch (error) {
        console.error('Error fetching customer data:', error);
        toast({
          variant: "destructive",
          title: "Hata",
          description: "Müşteri bilgileri yüklenemedi."
        });
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchCustomerData();
    }
  }, [id, toast]);

  // 🟢 MODAL KAPATMA
  const handleEditModalClose = () => {
    setEditModalOpen(false);
  };

  // 🟢 FLAGS UPDATE HANDLER
  const handleFlagsUpdate = (profileId, newFlags) => {
    setProfile(prev => ({
      ...prev,
      flag_vip_customer: newFlags.vip,
      flag_sensitive_customer: newFlags.sensitive,
      admin_note: newFlags.admin_note
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-teal-500" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4 p-8">
        <AlertTriangle className="w-16 h-16 text-slate-600" />
        <p className="text-slate-400 text-center">Müşteri bulunamadı.</p>
        <Button onClick={() => navigate(-1)} className="bg-teal-600 hover:bg-teal-700 text-white">
          <ArrowLeft className="w-4 h-4 mr-2" /> Geri Dön
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-0 md:p-4 pb-10">
      <Button variant="ghost" onClick={() => navigate(-1)} className="mb-6 text-slate-400 hover:text-white pl-0">
        <ArrowLeft className="w-4 h-4 mr-2" /> Geri Dön
      </Button>

      <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 mb-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <User className="w-6 h-6 text-teal-500" />
              {profile.name || "İsimsiz Müşteri"}
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              Kayıt: {new Date(profile.created_at).toLocaleDateString('tr-TR')}
            </p>
          </div>
          <div className="flex gap-2 items-center flex-wrap">
            {/* 🟢 EDIT BUTONU */}
            <Button 
              onClick={() => setEditModalOpen(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Edit className="w-4 h-4 mr-2" />
              Profili Düzenle
            </Button>
            {profile.flag_vip_customer && <Badge className="bg-purple-900/40 text-purple-400 border-purple-500/30">VIP Müşteri</Badge>}
            {profile.flag_sensitive_customer && <Badge className="bg-orange-900/40 text-orange-400 border-orange-500/30">Hassas Müşteri</Badge>}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-3">
             <div className="flex items-center gap-3 text-slate-300">
                <Mail className="w-4 h-4 text-slate-500" />
                <span>{profile.email || '-'}</span>
             </div>
             <div className="flex items-center gap-3 text-slate-300">
                <Phone className="w-4 h-4 text-slate-500" />
                <span>{profile.phone || '-'}</span>
             </div>
             <div className="flex items-center gap-3 text-slate-300">
                <Calendar className="w-4 h-4 text-slate-500" />
                <span>Kayıt: {new Date(profile.created_at).toLocaleDateString('tr-TR')}</span>
             </div>
          </div>
          
          <div className="col-span-2 bg-slate-900/50 rounded-lg p-4 border border-slate-700/50">
             <h3 className="text-sm font-semibold text-slate-400 mb-3">Müşteri Notları</h3>
             <p className="text-slate-300 text-sm whitespace-pre-wrap">
                {/* 🟢 FIELD NAME FIX: admin_note önce kontrol ediliyor */}
                {profile.admin_note || profile.flag_notes || "Bu müşteri için henüz bir not eklenmemiş."}
             </p>
          </div>
        </div>
      </div>

      <h2 className="text-xl font-bold text-white mb-4">Geri Bildirim Geçmişi ({feedbacks.length})</h2>
      
      <div className="space-y-4">
        {feedbacks.length === 0 ? (
           <p className="text-slate-500 italic">Henüz geri bildirim kaydı yok.</p>
        ) : (
          feedbacks.map((fb) => (
             <div key={fb.id} className="bg-slate-800/30 border border-slate-700/50 rounded-lg p-4 hover:bg-slate-800/50 transition-colors">
                <div className="flex flex-col md:flex-row justify-between gap-4 mb-3">
                   <div className="flex items-center gap-3">
                      <Badge variant="outline" className={`
                        ${fb.feedback_type === 'complaint' ? 'text-red-400 border-red-900/50 bg-red-900/10' : 
                          fb.feedback_type === 'suggestion' ? 'text-blue-400 border-blue-900/50 bg-blue-900/10' : 
                          'text-yellow-400 border-yellow-900/50 bg-yellow-900/10'}
                      `}>
                        {fb.feedback_type === 'complaint' ? 'Şikayet' : fb.feedback_type === 'suggestion' ? 'Öneri' : 'Değerlendirme'}
                      </Badge>
                      <span className="text-sm text-slate-400">{new Date(fb.created_at).toLocaleString('tr-TR')}</span>
                   </div>
                   <div className="flex items-center gap-2">
                      <span className={`text-xs px-2 py-1 rounded-full ${fb.status === 'resolved' ? 'bg-green-900/30 text-green-400' : 'bg-yellow-900/30 text-yellow-400'}`}>
                         {fb.status === 'resolved' ? 'Çözüldü' : fb.status === 'new' ? 'Yeni' : 'İşlemde'}
                      </span>
                   </div>
                </div>
                
                <p className="text-slate-200 mb-3">{fb.message || "Mesaj yok"}</p>
                
                <div className="flex items-center gap-4 text-xs text-slate-500">
                   <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {fb.branches?.branch_name_tr}</span>
                   {(fb.rating || fb.overall_rating) > 0 && (
                      <span className="flex items-center gap-1 text-yellow-500"><Star className="w-3 h-3 fill-current" /> {fb.rating || fb.overall_rating}/5</span>
                   )}
                </div>
             </div>
          ))
        )}
      </div>

      {/* 🟢 CUSTOMER PROFILE MODAL */}
      {editModalOpen && (
        <CustomerProfileModal 
          isOpen={editModalOpen}
          onClose={handleEditModalClose}
          customerProfileId={profile.id}
          customerEmail={profile.email}
          businessId={profile.business_id}
          onFlagsUpdate={handleFlagsUpdate}
        />
      )}
    </div>
  );
};

export default CustomerDetail;
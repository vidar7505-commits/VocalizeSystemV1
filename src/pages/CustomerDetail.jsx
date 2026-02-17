import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/customSupabaseClient';
import { useAdminContext } from '@/contexts/AdminContext'; // Eklenen
import { useTranslation } from 'react-i18next';
import { ArrowLeft, User, Mail, Phone, Calendar, Star, MessageSquare, AlertTriangle, MapPin, Loader2, Edit, Crown } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import CustomerProfileModal from '@/components/CustomerProfileModal';

const CustomerDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { businessId } = useAdminContext(); // Eklenen: Business Context
  const { toast } = useToast();
  const { t, i18n } = useTranslation();
  
  const [profile, setProfile] = useState(null);
  const [businessData, setBusinessData] = useState(null); // Eklenen: İşletme özel verisi
  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // 🟢 EDIT MODAL
  const [editModalOpen, setEditModalOpen] = useState(false);

  useEffect(() => {
    const fetchCustomerData = async () => {
      if (!businessId) return; // Güvenlik kontrolü
      setLoading(true);
      try {
        // 🟢 PROMISE.ALL ile paralel fetch (GÜNCELLENDİ)
        const [profileRes, businessRes, feedbackRes] = await Promise.all([
          // 1. Temel Profil Bilgisi
          supabase
            .from('customer_profiles')
            .select('*')
            .eq('id', id)
            .single(),
          
          // 2. İşletmeye Özel Veri (business_customers)
          supabase
            .from('business_customers')
            .select('*')
            .eq('business_id', businessId)
            .eq('customer_profile_id', id)
            .maybeSingle(),

          // 3. Feedback Geçmişi (Sadece bu işletme)
          supabase
            .from('feedbacks')
            .select('*, branches(branch_name_tr)')
            .eq('customer_profile_id', id)
            .eq('business_id', businessId)
            .order('created_at', { ascending: false })
        ]);

        if (profileRes.error) throw profileRes.error;
        setProfile(profileRes.data);
        
        // İşletme verisi yoksa varsayılan boş obje
        setBusinessData(businessRes.data || { is_vip: false, is_sensitive: false, manager_notes: '' });

        if (feedbackRes.error) throw feedbackRes.error;
        setFeedbacks(feedbackRes.data || []);

      } catch (error) {
        console.error('Error fetching customer data:', error);
        toast({
          variant: "destructive",
          title: t('common.error'),
          description: t('admin.customerDetail.errorLoading')
        });
      } finally {
        setLoading(false);
      }
    };

    if (id && businessId) {
      fetchCustomerData();
    }
  }, [id, businessId, toast]);

  // 🟢 MODAL KAPATMA
  const handleEditModalClose = () => {
    setEditModalOpen(false);
  };

  // 🟢 FLAGS UPDATE HANDLER (GÜNCELLENDİ)
  const handleFlagsUpdate = (profileId, newFlags) => {
    // Sadece işletmeye özel state'i güncelle
    setBusinessData(prev => ({
      ...prev,
      is_vip: newFlags.vip,
      is_sensitive: newFlags.sensitive,
      manager_notes: newFlags.admin_note
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
        <p className="text-slate-400 text-center">{t('admin.customerDetail.notFound')}</p>
        <Button onClick={() => navigate(-1)} className="bg-teal-600 hover:bg-teal-700 text-white">
          <ArrowLeft className="w-4 h-4 mr-2" /> {t('admin.customerDetail.back')}
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-0 md:p-4 pb-10">
      <Button variant="ghost" onClick={() => navigate(-1)} className="mb-6 text-slate-400 hover:text-white pl-0">
        <ArrowLeft className="w-4 h-4 mr-2" /> {t('admin.customerDetail.back')}
      </Button>

      <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 mb-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <User className="w-6 h-6 text-teal-500" />
              <span translate="no">{profile.name || t('admin.customerDetail.unnamed')}</span>
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              {t('admin.customerDetail.registered')}: <span translate="no">{new Date(profile.created_at).toLocaleDateString(i18n.language)}</span>
            </p>
          </div>
          <div className="flex gap-2 items-center flex-wrap">
            {/* 🟢 EDIT BUTONU */}
            <Button 
              onClick={() => setEditModalOpen(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Edit className="w-4 h-4 mr-2" />
              {t('admin.customerDetail.editProfile')}
            </Button>
            {/* GÜNCELLENDİ: Flagler businessData'dan okunuyor */}
            {businessData?.is_vip && <Badge className="bg-purple-900/40 text-purple-400 border-purple-500/30 flex gap-1"><Crown className="w-3 h-3" /> {t('admin.customerDetail.vipBadge')}</Badge>}
            {businessData?.is_sensitive && <Badge className="bg-orange-900/40 text-orange-400 border-orange-500/30 flex gap-1"><AlertTriangle className="w-3 h-3" /> {t('admin.customerDetail.sensitiveBadge')}</Badge>}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-3">
             <div className="flex items-center gap-3 text-slate-300">
                <Mail className="w-4 h-4 text-slate-500" />
                <span translate="no">{profile.email || '-'}</span>
             </div>
             <div className="flex items-center gap-3 text-slate-300">
                <Phone className="w-4 h-4 text-slate-500" />
                <span translate="no">{profile.phone || '-'}</span>
             </div>
             <div className="flex items-center gap-3 text-slate-300">
                <Calendar className="w-4 h-4 text-slate-500" />
                <span translate="no">{t('admin.customerDetail.registered')}: {new Date(profile.created_at).toLocaleDateString(i18n.language)}</span>
             </div>
          </div>
          
          <div className="col-span-2 bg-slate-900/50 rounded-lg p-4 border border-slate-700/50">
             <h3 className="text-sm font-semibold text-slate-400 mb-3">{t('admin.customerDetail.businessNotes')}</h3>
             <p className="text-slate-300 text-sm whitespace-pre-wrap">
                {/* GÜNCELLENDİ: Notlar businessData'dan okunuyor */}
                {businessData?.manager_notes || t('admin.customerDetail.noNotes')}
             </p>
          </div>
        </div>
      </div>

      <h2 className="text-xl font-bold text-white mb-4">{t('admin.customerDetail.historyTitle')} ({feedbacks.length})</h2>
      
      <div className="space-y-4">
        {feedbacks.length === 0 ? (
           <p className="text-slate-500 italic">{t('admin.customerDetail.noFeedback')}</p>
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
                        {t(`feedbackDetail.detail.types.${fb.feedback_type}`, { defaultValue: fb.feedback_type === 'complaint' ? t('feedbackDetail.detail.types.complaint') : fb.feedback_type === 'suggestion' ? t('feedbackDetail.detail.types.suggestion') : t('feedbackDetail.detail.types.evaluation') })}
                      </Badge>
                      <span className="text-sm text-slate-400">{new Date(fb.created_at).toLocaleString(i18n.language)}</span>
                   </div>
                   <div className="flex items-center gap-2">
                      <span className={`text-xs px-2 py-1 rounded-full ${fb.status === 'resolved' ? 'bg-green-900/30 text-green-400' : 'bg-yellow-900/30 text-yellow-400'}`}>
                         {t(`feedbackDetail.detail.statuses.${fb.status}`, { defaultValue: fb.status === 'resolved' ? t('feedbackDetail.detail.statuses.resolved') : fb.status === 'new' ? t('feedbackDetail.detail.statuses.new') : t('feedbackDetail.detail.statuses.in_progress') })}
                      </span>
                   </div>
                </div>
                
                <p className="text-slate-200 mb-3">{fb.message || t('admin.customerDetail.noMessage')}</p>
                
                <div className="flex items-center gap-4 text-xs text-slate-500">
                   <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> <span translate="no">{fb.branches?.branch_name_tr}</span></span>
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
          businessId={businessId} // GÜNCELLENDİ: businessId geçiriliyor
          onFlagsUpdate={handleFlagsUpdate}
        />
      )}
    </div>
  );
};

export default CustomerDetail;
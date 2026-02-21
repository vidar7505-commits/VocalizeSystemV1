import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/customSupabaseClient';
import { useAdminContext } from '@/contexts/AdminContext'; // Eklenen
import { ArrowLeft, User, Mail, Phone, Calendar, Star, MessageSquare, AlertTriangle, MapPin, Loader2, Edit, Crown } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import CustomerProfileModal from '@/components/CustomerProfileModal';
import { useTranslation } from 'react-i18next'; // GÜNCELLENDİ

const CustomerDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { businessId, businessName } = useAdminContext(); // GÜNCELLENDİ
  const { toast } = useToast();
  const { t, i18n } = useTranslation('admin'); // GÜNCELLENDİ

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
            .select('*, branches(branch_name_tr, branch_name_en)') // GÜNCELLENDİ: branch_name_en de çekiliyor
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
          title: t('common:toasts.error_title'),
          description: t('customer_profile.error_loading')
        });
      } finally {
        setLoading(false);
      }
    };

    if (id && businessId) {
      fetchCustomerData();
    }
  }, [id, businessId, toast, t]); // GÜNCELLENDİ: t dependency eklendi

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
        <p className="text-slate-400 text-center">{t('customer_profile.no_records')}</p>
        <Button onClick={() => navigate(-1)} className="bg-teal-600 hover:bg-teal-700 text-white">
          <ArrowLeft className="w-4 h-4 mr-2" /> {t('customer_profile.close')}
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-0 md:p-4 pb-10">
      <Button variant="ghost" onClick={() => navigate(-1)} className="mb-6 text-slate-400 hover:text-white pl-0">
        <ArrowLeft className="w-4 h-4 mr-2" /> {t('customer_profile.close')}
      </Button>

      <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 mb-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <User className="w-6 h-6 text-teal-500" />
              {profile.name || t('customer_profile.no_name')} {/* GÜNCELLENDİ: no_message yerine no_name */}
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              {t('customer_profile.info.registered')}: {new Date(profile.created_at).toLocaleDateString(i18n.language === 'tr' ? 'tr-TR' : 'en-US')}
            </p>
          </div>
          <div className="flex gap-2 items-center flex-wrap">
            {/* 🟢 EDIT BUTONU */}
            <Button
              onClick={() => setEditModalOpen(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Edit className="w-4 h-4 mr-2" />
              {t('customer_profile.edit_profile')} {/* GÜNCELLENDİ: save yerine edit_profile */}
            </Button>
            {/* GÜNCELLENDİ: Flagler businessData'dan okunuyor */}
            {businessData?.is_vip && <Badge className="bg-purple-900/40 text-purple-400 border-purple-500/30 flex gap-1"><Crown className="w-3 h-3" /> {t('customer_profile.switches.vip')}</Badge>}
            {businessData?.is_sensitive && <Badge className="bg-orange-900/40 text-orange-400 border-orange-500/30 flex gap-1"><AlertTriangle className="w-3 h-3" /> {t('customer_profile.switches.sensitive')}</Badge>}
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
              <span>{t('customer_profile.info.registered')}: {new Date(profile.created_at).toLocaleDateString(i18n.language === 'tr' ? 'tr-TR' : 'en-US')}</span>
            </div>
          </div>

          <div className="col-span-2 bg-slate-900/50 rounded-lg p-4 border border-slate-700/50">
            <h3 className="text-sm font-semibold text-slate-400 mb-3">{t('customer_profile.switches.business_note')}</h3>
            <p className="text-slate-300 text-sm whitespace-pre-wrap">
              {/* GÜNCELLENDİ: Notlar businessData'dan okunuyor */}
              {businessData?.manager_notes || t('customer_profile.switches.note_placeholder')}
            </p>
          </div>
        </div>
      </div>

      <h2 className="text-xl font-bold text-white mb-4">{t('customer_profile.history.title')} ({feedbacks.length})</h2>

      <div className="space-y-4">
        {feedbacks.length === 0 ? (
          <p className="text-slate-500 italic">{t('customer_profile.history.no_records')}</p>
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
                    {fb.feedback_type === 'complaint' ? t('customer_profile.stats.complaint').replace(':', '') : fb.feedback_type === 'suggestion' ? t('customer_profile.stats.suggestion').replace(':', '') : t('customer_profile.stats.evaluation').replace(':', '')}
                  </Badge>
                  <span className="text-sm text-slate-400">{new Date(fb.created_at).toLocaleString(i18n.language === 'tr' ? 'tr-TR' : 'en-US')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-1 rounded-full ${fb.status === 'resolved' ? 'bg-green-900/30 text-green-400' : 'bg-yellow-900/30 text-yellow-400'}`}>
                    {fb.status === 'resolved' ? t('feedback_management.status.resolved') : fb.status === 'new' ? t('feedback_management.status.new') : t('feedback_management.status.in_progress')}
                  </span>
                </div>
              </div>

              <p className="text-slate-200 mb-3">{fb.message || t('customer_profile.history.no_message')}</p>

              <div className="flex items-center gap-4 text-xs text-slate-500">
                <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {(i18n.language === 'en' && fb.branches?.branch_name_en) ? fb.branches.branch_name_en : fb.branches?.branch_name_tr}</span>
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
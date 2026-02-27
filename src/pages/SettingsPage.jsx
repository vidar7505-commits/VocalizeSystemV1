import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useAdminContext } from '@/contexts/AdminContext';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { User, Lock, Save, MessageSquare, Loader2, Image as ImageIcon, Upload, X, Moon, Sun, HelpCircle, Globe } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useTranslation } from 'react-i18next';

const SettingsPage = () => {
  const { t, i18n } = useTranslation(['admin', 'common']);
  const { user } = useAuth();
  const { businessName, theme, toggleTheme } = useAdminContext();
  const { toast } = useToast();

  const [passwords, setPasswords] = useState({ new: '', confirm: '' });
  const [passwordLoading, setPasswordLoading] = useState(false);

  // Feedback Modal State
  const [feedbackModalOpen, setFeedbackModalOpen] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [feedbackImages, setFeedbackImages] = useState([]);

  // 🟢 REMOVED: Local Theme Management moved to AdminContext


  // 🟢 MOBİL GERİ TUŞU: Feedback Modal
  useEffect(() => {
    if (!feedbackModalOpen) return;

    const handlePopState = () => {

      setFeedbackModalOpen(false);
      setFeedbackMessage('');
      setFeedbackImages([]);
    };

    window.history.pushState({ feedbackModal: true }, '');
    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [feedbackModalOpen]);

  // 🟢 MEMORY LEAK FIX: Image Preview URL Cleanup
  useEffect(() => {
    return () => {
      feedbackImages.forEach(file => {
        try {
          const url = URL.createObjectURL(file);
          URL.revokeObjectURL(url);
        } catch (e) {
          // Ignore errors
        }
      });
    };
  }, [feedbackImages]);

  const handlePasswordUpdate = async (e) => {
    e.preventDefault();
    if (passwords.new !== passwords.confirm) {
      toast({ variant: "destructive", title: t('settings.feedback_modal.error_title'), description: t('settings.password.error_match') });
      return;
    }
    if (passwords.new.length < 6) {
      toast({ variant: "destructive", title: t('settings.feedback_modal.error_title'), description: t('settings.password.error_length') });
      return;
    }

    setPasswordLoading(true);
    const { error } = await supabase.auth.updateUser({ password: passwords.new });
    setPasswordLoading(false);

    if (error) {
      toast({ variant: "destructive", title: t('settings.feedback_modal.error_title'), description: error.message });
    } else {
      toast({ title: t('feedback_management.toast.bulk_update_success_title'), description: t('settings.password.success') });
      setPasswords({ new: '', confirm: '' });
    }
  };

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);
    const remainingSlots = 3 - feedbackImages.length;

    if (files.length > remainingSlots) {
      toast({
        title: t('settings.feedback_modal.error_title'),
        description: t('sidebar.contact_modal.error_max_images'),
        variant: "destructive"
      });
      return;
    }

    setFeedbackImages(prev => [...prev, ...files.slice(0, remainingSlots)]);
  };

  const removeImage = (index) => {
    setFeedbackImages(prev => prev.filter((_, i) => i !== index));
  };

  const uploadImages = async () => {
    const uploadedUrls = [];

    for (const file of feedbackImages) {
      const fileName = `manager-feedback/${Date.now()}_${Math.random().toString(36).substr(2, 9)}_${file.name.replace(/[^a-zA-Z0-9]/g, '')}`;

      const { data, error } = await supabase.storage
        .from('feedback-images')
        .upload(fileName, file);

      if (error) {
        console.error('Error uploading file:', error);
        continue;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('feedback-images')
        .getPublicUrl(fileName);

      uploadedUrls.push(publicUrl);
    }

    return uploadedUrls;
  };

  const handleFeedbackSubmit = async (e) => {
    e.preventDefault();
    if (!user) {
      toast({ variant: "destructive", title: t('settings.feedback_modal.error_title'), description: t('settings.feedback_modal.auth_error') });
      return;
    }
    if (!feedbackMessage.trim()) {
      toast({ variant: "destructive", title: t('settings.feedback_modal.error_title'), description: t('settings.feedback_modal.empty_error') });
      return;
    }

    setFeedbackLoading(true);
    try {
      let imageUrls = [];
      if (feedbackImages.length > 0) {
        imageUrls = await uploadImages();
      }

      const { error } = await supabase.from('vocalize_manager_feedbacks').insert({
        manager_id: user.id,
        message: feedbackMessage,
        images: imageUrls
      });

      if (error) throw error;

      toast({
        title: t('settings.feedback_modal.success_title'),
        description: t('settings.feedback_modal.success_desc'),
        className: "bg-teal-600 text-white border-none"
      });
      setFeedbackMessage('');
      setFeedbackImages([]);
      setFeedbackModalOpen(false);
    } catch (error) {
      console.error('Feedback submit error:', error);
      toast({ variant: "destructive", title: t('settings.feedback_modal.error_title'), description: t('settings.feedback_modal.error_desc') });
    } finally {
      setFeedbackLoading(false);
    }
  };

  // 🟢 MODAL KAPATMA (History desteği ile)
  const handleCloseModal = () => {
    setFeedbackModalOpen(false);
    setFeedbackMessage('');
    setFeedbackImages([]);

    if (window.history.state?.feedbackModal) {
      window.history.back();
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 pt-16 md:pt-0 pb-10">
      <div className="flex justify-center md:justify-start">
        <h1 className="text-2xl font-bold text-white">{t('settings.title')}</h1>
      </div>

      {/* Profile Section */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-800">
          <User className="w-5 h-5 text-blue-400" />
          <h2 className="text-lg font-semibold text-white">{t('settings.profile.title')}</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-sm text-slate-400">{t('settings.profile.email')}</label>
            <Input value={user?.email || ''} disabled className="bg-slate-950 border-slate-800 text-slate-500" />
          </div>
          <div className="space-y-2">
            <label className="text-sm text-slate-400">{t('settings.profile.business_name')}</label>
            <Input value={businessName} disabled className="bg-slate-950 border-slate-800 text-slate-500" />
          </div>
          <div className="pt-4 border-t border-slate-800 mt-4">
            <Button
              variant="outline"
              className="w-full bg-slate-800 border-slate-700 text-slate-300 hover:text-teal-400 hover:bg-teal-900/20"
              onClick={() => {
                localStorage.setItem('vocalize_force_tour', 'true');
                window.location.href = '/admin-panel';
              }}
            >
              <HelpCircle className="w-4 h-4 mr-2" />
              {t('onboarding.restart_tour')}
            </Button>
          </div>
        </div>
      </div>

      {/* Appearance Section */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-800">
          {theme === 'dark' ? <Moon className="w-5 h-5 text-indigo-400" /> : <Sun className="w-5 h-5 text-yellow-400" />}
          <h2 className="text-lg font-semibold text-white">{t('settings.appearance.title')}</h2>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="space-y-1 flex-1">
            <label className="text-sm font-medium text-slate-200">{t('settings.appearance.preference')}</label>
            <p className="text-xs text-slate-400">{t('settings.appearance.description')}</p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Language Switcher */}
            <div className="flex items-center bg-slate-950 p-1 rounded-lg border border-slate-800">
              <button
                onClick={() => i18n.changeLanguage('tr')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${i18n.language === 'tr' ? 'bg-teal-500/20 text-teal-400 border border-teal-500/20 shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
              >
                TR
              </button>
              <button
                onClick={() => i18n.changeLanguage('en')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${i18n.language === 'en' ? 'bg-teal-500/20 text-teal-400 border border-teal-500/20 shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
              >
                EN
              </button>
            </div>

            {/* Theme Switcher */}
            <div className="flex items-center bg-slate-950 p-1 rounded-lg border border-slate-800">
              <button
                onClick={() => toggleTheme('light')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${theme === 'light' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
              >
                <Sun className="w-4 h-4" />
                {t('settings.appearance.light')}
              </button>
              <button
                onClick={() => toggleTheme('dark')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${theme === 'dark' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
              >
                <Moon className="w-4 h-4" />
                {t('settings.appearance.dark')}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Password Section */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-800">
          <Lock className="w-5 h-5 text-orange-400" />
          <h2 className="text-lg font-semibold text-white">{t('settings.password.title')}</h2>
        </div>
        <form onSubmit={handlePasswordUpdate} className="space-y-4 max-w-md">
          <div className="space-y-2">
            <label className="text-sm text-slate-400">{t('settings.password.new_password')}</label>
            <Input
              type="password"
              value={passwords.new}
              onChange={(e) => setPasswords({ ...passwords, new: e.target.value })}
              className="bg-slate-800 border-slate-700 text-white transition-all focus:border-blue-500/50"
              placeholder="••••••••"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm text-slate-400">{t('settings.password.confirm_password')}</label>
            <Input
              type="password"
              value={passwords.confirm}
              onChange={(e) => setPasswords({ ...passwords, confirm: e.target.value })}
              className="bg-slate-800 border-slate-700 text-white transition-all focus:border-blue-500/50"
              placeholder="••••••••"
            />
          </div>
          <Button disabled={passwordLoading} type="submit" className="w-full bg-teal-600 hover:bg-teal-700 text-white">
            {passwordLoading ? t('settings.password.updating') : <><Save className="w-4 h-4 mr-2" /> {t('settings.password.update_button')}</>}
          </Button>
        </form>
      </div>

      {/* Vocalize Feedback Section */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-800">
          <MessageSquare className="w-5 h-5 text-purple-400" />
          <h2 className="text-lg font-semibold text-white">{t('settings.vocalize_feedback.title')}</h2>
        </div>
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <p className="text-slate-400 text-sm max-w-lg">
            {t('settings.vocalize_feedback.description')}
          </p>
          <Button onClick={() => setFeedbackModalOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white whitespace-nowrap">
            <MessageSquare className="w-4 h-4 mr-2" />
            {t('settings.vocalize_feedback.button')}
          </Button>
        </div>
      </div>

      <Dialog open={feedbackModalOpen} onOpenChange={handleCloseModal}>
        <DialogContent className="sm:max-w-[500px] bg-slate-900 border-slate-800 text-white">
          <DialogHeader>
            <DialogTitle className="text-white">{t('settings.feedback_modal.title')}</DialogTitle>
            <DialogDescription className="text-slate-400">
              {t('settings.feedback_modal.description')}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleFeedbackSubmit} className="grid gap-4 py-4">
            <div className="grid gap-2">
              <label htmlFor="feedback-message" className="text-sm font-medium text-slate-200">{t('settings.feedback_modal.message_label')}</label>
              <textarea
                id="feedback-message"
                rows="4"
                placeholder={t('settings.feedback_modal.message_placeholder')}
                value={feedbackMessage}
                onChange={(e) => setFeedbackMessage(e.target.value)}
                className="w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
                required
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-slate-200 flex items-center gap-2">
                  <ImageIcon className="w-4 h-4" />
                  {t('settings.feedback_modal.images_label')}
                </label>
                <span className="text-xs text-slate-500">{feedbackImages.length}/3</span>
              </div>

              <div className="flex flex-wrap gap-3">
                {feedbackImages.map((file, idx) => (
                  <div key={idx} className="relative w-20 h-20 rounded-lg overflow-hidden border border-slate-700 group">
                    <img
                      src={URL.createObjectURL(file)}
                      alt="preview"
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => removeImage(idx)}
                      className="absolute top-1 right-1 bg-black/60 hover:bg-red-600 text-white rounded-full p-1 transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}

                {feedbackImages.length < 3 && (
                  <label className="w-20 h-20 flex flex-col items-center justify-center border border-dashed border-slate-700 rounded-lg cursor-pointer hover:bg-slate-800/50 hover:border-blue-500/50 transition-colors">
                    <Upload className="w-5 h-5 text-slate-400 mb-1" />
                    <span className="text-[10px] text-slate-500">{t('settings.feedback_modal.upload')}</span>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={handleImageChange}
                    />
                  </label>
                )}
              </div>
            </div>

            <DialogFooter className="mt-2">
              <Button type="submit" disabled={feedbackLoading} className="bg-blue-600 hover:bg-blue-700 text-white w-full">
                {feedbackLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {t('settings.feedback_modal.submit')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SettingsPage;
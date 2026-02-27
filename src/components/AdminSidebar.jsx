import React, { useState, useEffect, useMemo } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, MessageSquare, BarChart3, Settings,
  Menu, X, LogOut, Send, Loader2, Image as ImageIcon, Upload,
  Sun, Moon, Globe
} from 'lucide-react';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useAdminContext } from '@/contexts/AdminContext';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { AnimatePresence, motion } from 'framer-motion';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from "@/components/ui/use-toast";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useTranslation } from 'react-i18next';

const AdminSidebar = () => {
  const { pathname } = useLocation();
  const { signOut, user } = useAuth();
  const { businessName, isSpecialOffer, monthlyFeeOverride, theme, toggleTheme } = useAdminContext();
  const [isOpen, setIsOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t, i18n } = useTranslation(['admin', 'common']);

  // 🟢 REMOVED: Local Theme Management moved to AdminContext

  // Modal State
  const [feedbackModalOpen, setFeedbackModalOpen] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [feedbackImages, setFeedbackImages] = useState([]);

  // Close sidebar on route change
  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  // Badge configuration for special offers
  const badgeConfig = useMemo(() => {
    if (!isSpecialOffer) return null;

    // Note: These badge texts are already translated in AdminHeader (common.json), 
    // but here we are in AdminSidebar which uses admin.json mostly.
    // Ideally we should use common keys or duplicate. Since they are complex objects,
    // and partly dynamic, I will keep hardcoded here or use specific keys if created.
    // User asked for specific strings. I will use common namespace keys for badges if possible or leave as is if not requested.
    // The user request didn't explicitly ask for badge translations in sidebar, but mostly menu items.
    // However, for consistency, I'll try to use common keys if I can access them.
    // But since I only imported 'admin' namespace, I need to load 'common' too or keep it hardcoded.
    // I initialized useTranslation with 'admin', but it loads defaultNS 'common' too usually.
    // Let's stick to the requested scope: "Sidebar: 'Dashboard', 'Analysis', 'Feedback Management', 'Branches', 'Settings'..."
    // leaving badges as is to minimize risk unless explicitly asked.

    const fee = monthlyFeeOverride || 79.00;

    if (fee === 79.00) {
      return {
        text: t('badges.early_access', { ns: 'common' }),
        icon: "⭐",
        badgeClassName: "bg-amber-500/10 border-amber-500/30 text-amber-400 hover:bg-amber-500/20",
        cardTitle: t('badges.early_access_title', { ns: 'common' }),
        cardDesc: t('badges.early_access_desc', { ns: 'common' }),
        cardBorderColor: "border-amber-500/50",
        cardTitleColor: "text-amber-400"
      };
    } else {
      return {
        text: t('badges.flexible_plan', { ns: 'common' }),
        icon: "🚀",
        badgeClassName: "bg-teal-500/10 border-teal-500/30 text-teal-400 hover:bg-teal-500/20",
        cardTitle: t('badges.flexible_plan_title', { ns: 'common' }),
        cardDesc: t('badges.flexible_plan_desc', { ns: 'common', fee: fee }),
        cardBorderColor: "border-teal-500/50",
        cardTitleColor: "text-teal-400"
      };
    }
  }, [isSpecialOffer, monthlyFeeOverride, t]);

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  // Feedback Modal Logic
  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);
    const remainingSlots = 3 - feedbackImages.length;

    if (files.length > remainingSlots) {
      toast({
        title: t('sidebar.contact_modal.error_title'),
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
      toast({ variant: "destructive", title: t('sidebar.contact_modal.error_title'), description: t('sidebar.contact_modal.error_session') });
      return;
    }
    if (!feedbackMessage.trim()) {
      toast({ variant: "destructive", title: t('sidebar.contact_modal.error_title'), description: t('sidebar.contact_modal.error_empty_message') });
      return;
    }

    setFeedbackLoading(true);
    try {
      let imageUrls = [];
      if (feedbackImages.length > 0) {
        imageUrls = await uploadImages();
      }

      // 🟢 YÖNETİCİ BİLGİSİ HAZIRLA
      const managerEmail = user.email || user.user_metadata?.email || '';
      const managerName = user.user_metadata?.full_name || user.user_metadata?.first_name || t('sidebar.contact_modal.default_manager_name');

      const { error } = await supabase.from('vocalize_manager_feedbacks').insert({
        manager_id: user.id,
        message: feedbackMessage,
        images: imageUrls,
        email: managerEmail,
        first_name: managerName,
        business_name: businessName || t('sidebar.contact_modal.default_business_name')
      });

      if (error) throw error;

      toast({
        title: t('sidebar.contact_modal.success_title'),
        description: t('sidebar.contact_modal.success_desc'),
        className: "bg-teal-600 text-white border-none"
      });
      setFeedbackMessage('');
      setFeedbackImages([]);
      setFeedbackModalOpen(false);
    } catch (error) {
      console.error('Feedback submit error:', error);
      toast({ variant: "destructive", title: t('sidebar.contact_modal.error_title'), description: t('sidebar.contact_modal.error_desc') });
    } finally {
      setFeedbackLoading(false);
    }
  };

  const navItems = [
    { icon: LayoutDashboard, label: t('sidebar.dashboard'), path: '/admin-panel', id: 'sidebar-dashboard' },
    { icon: MessageSquare, label: t('sidebar.feedbacks'), path: '/admin-panel/feedbacks', id: 'sidebar-feedbacks' },
    { icon: BarChart3, label: t('sidebar.analytics'), path: '/admin-panel/analytics', id: 'sidebar-analytics' },
    { icon: Settings, label: t('sidebar.settings'), path: '/admin-panel/settings', id: 'sidebar-settings' },
  ];

  const isActive = (path) => {
    if (path === '/admin-panel' && pathname === '/admin-panel') return true;
    if (path !== '/admin-panel' && pathname.startsWith(path)) return true;
    return false;
  };

  return (
    <>
      {/* Mobile Trigger */}
      <div className="fixed top-3 left-4 z-50 md:hidden">
        <Button
          id="mobile-menu-trigger"
          variant="ghost"
          size="icon"
          onClick={() => setIsOpen(true)}
          className="text-white hover:bg-slate-800 rounded-full bg-slate-900/50 backdrop-blur-sm border border-slate-700/50 shadow-sm"
        >
          <Menu className="w-5 h-5" />
        </Button>
      </div>

      {/* Sidebar Content (Desktop & Mobile) */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 w-64 bg-[#111827] border-r border-slate-800 flex flex-col transition-transform duration-300 ease-in-out md:translate-x-0 md:static",
        isOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"
      )}>
        {/* Logo Area */}
        <div className="h-16 flex items-center justify-between px-6 border-b border-slate-800 bg-[#111827]">
          <div className="flex items-center gap-3">
            <img
              src="/faviconmain.png"
              alt="Vocalize Logo"
              className="h-10 w-10 object-contain shrink-0"
              style={{ filter: 'brightness(0) saturate(100%) invert(64%) sepia(88%) saturate(402%) hue-rotate(132deg) brightness(95%) contrast(91%)' }}
            />
            <span className="text-2xl font-bold text-teal-500">Vocalize</span>
          </div>
          {/* Mobile Close Button */}
          <button
            onClick={() => setIsOpen(false)}
            className="md:hidden ml-auto text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-6 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              id={item.id}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200",
                isActive(item.path)
                  ? "bg-teal-500/10 text-teal-400 border border-teal-500/20"
                  : "text-slate-400 hover:text-slate-100 hover:bg-slate-800"
              )}
            >
              <item.icon className={cn("w-5 h-5", isActive(item.path) ? "text-teal-400" : "text-slate-500")} />
              {item.label}
            </Link>
          ))}
        </nav>

        {/* User / Footer */}
        <div className="p-4 border-t border-slate-800 bg-[#0f172a]/50 flex flex-col gap-3">
          {/* Erken Erişim Flag - Ayrı Bölüm */}
          {badgeConfig && (
            <button
              onClick={() => setIsHovered(prev => !prev)}
              className={cn(
                "w-full flex items-center gap-2 px-3 py-2.5 rounded-lg border transition-all duration-200",
                badgeConfig.badgeClassName
              )}
            >
              <span className="text-lg">{badgeConfig.icon}</span>
              <span className="text-xs font-semibold">{badgeConfig.text}</span>
            </button>
          )}

          {/* Contact Button - Style Updated as requested */}
          <Button
            variant="ghost"
            className="w-full justify-start text-teal-400 hover:text-teal-300 hover:bg-teal-900/20 group border border-dashed border-slate-700 hover:border-teal-500/30"
            onClick={() => setFeedbackModalOpen(true)}
          >
            <Send className="w-4 h-4 mr-2 group-hover:text-teal-300 transition-colors" />
            <span className="font-medium transition-colors">{t('sidebar.contact_us')}</span>
          </Button>

          <div className="relative flex items-center gap-3 px-2 py-2 rounded-lg bg-slate-800/30 transition-colors hover:bg-slate-800/50">
            <div className="profile-avatar w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-white shrink-0">
              {businessName ? businessName.substring(0, 2).toUpperCase() : 'AD'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{businessName || 'Admin Panel'}</p>
              <p className="text-xs text-slate-500 truncate">{t('sidebar.admin_role')}</p>
            </div>
          </div>

          {/* Tema / Dil Değiştir - Sadece Mobil */}
          <div className="md:hidden grid grid-cols-2 gap-2">
            <button
              onClick={toggleTheme}
              className="flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-slate-800/50 text-slate-300 hover:text-white hover:bg-slate-700/70 border border-slate-700/70 text-[10px] font-medium transition-all"
            >
              {theme === 'dark' ? (
                <>
                  <Moon className="w-3.5 h-3.5" />
                  <span>{t('sidebar.theme_dark')}</span>
                </>
              ) : (
                <>
                  <Sun className="w-3.5 h-3.5 text-yellow-400" />
                  <span>{t('sidebar.theme_light')}</span>
                </>
              )}
            </button>

            <button
              onClick={() => i18n.changeLanguage(i18n.language === 'tr' ? 'en' : 'tr')}
              className="flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-slate-800/50 text-slate-300 hover:text-white hover:bg-slate-700/70 border border-slate-700/70 text-[10px] font-medium transition-all"
            >
              <Globe className="w-3.5 h-3.5 text-teal-400" />
              <span>{i18n.language === 'tr' ? 'English' : 'Türkçe'}</span>
            </button>
          </div>

          <Button
            onClick={handleLogout}
            variant="outline"
            className="logout-sidebar-btn w-full border-slate-700 bg-slate-800/50 text-slate-300 hover:text-white hover:bg-red-900/20 hover:border-red-800/50 group h-9"
          >
            <LogOut className="w-4 h-4 mr-2 group-hover:text-red-400 transition-colors" />
            <span className="group-hover:text-red-300 transition-colors text-xs">{t('sidebar.logout')}</span>
          </Button>
        </div>

        {/* Hover Card Modal - Sidebar dışında fixed positioned */}
        {badgeConfig && isHovered && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 bg-black/60 z-[90] backdrop-blur-sm"
              onClick={() => setIsHovered(false)}
            />

            {/* Modal Card */}
            <div
              className={cn(
                "fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[85%] max-w-sm px-4 py-3 rounded-lg shadow-2xl z-[100] bg-slate-800 border",
                badgeConfig.cardBorderColor
              )}
              onClick={(e) => e.stopPropagation()}
            >
              <div className={cn("text-sm font-semibold mb-1.5", badgeConfig.cardTitleColor)}>
                {badgeConfig.cardTitle}
              </div>
              <div className="text-xs text-slate-300 leading-relaxed">
                {badgeConfig.cardDesc}
              </div>
            </div>
          </>
        )}
      </aside>

      {/* Mobile Overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 bg-black/80 z-40 md:hidden backdrop-blur-sm"
          />
        )}
      </AnimatePresence>

      {/* Feedback Modal */}
      <Dialog open={feedbackModalOpen} onOpenChange={setFeedbackModalOpen}>
        <DialogContent className="sm:max-w-[500px] bg-slate-900 border-slate-800 text-white">
          <DialogHeader>
            <DialogTitle className="text-white">{t('sidebar.contact_modal.title')}</DialogTitle>
            <DialogDescription className="text-slate-400">
              {t('sidebar.contact_modal.description')}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleFeedbackSubmit} className="grid gap-4 py-4">
            <div className="grid gap-2">
              <label htmlFor="feedback-message" className="text-sm font-medium text-slate-200">{t('sidebar.contact_modal.message_label')}</label>
              <textarea
                id="feedback-message"
                rows="4"
                placeholder={t('sidebar.contact_modal.message_placeholder')}
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
                  {t('sidebar.contact_modal.images_optional')}
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
                    <span className="text-[10px] text-slate-500">{t('sidebar.contact_modal.upload')}</span>
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
                {t('sidebar.contact_modal.submit')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default AdminSidebar;
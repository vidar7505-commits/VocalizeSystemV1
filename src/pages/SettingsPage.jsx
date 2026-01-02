import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useAdminContext } from '@/contexts/AdminContext';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { User, Lock, Save, MessageSquare, Loader2, Image as ImageIcon, Upload, X } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

const SettingsPage = () => {
  const { user } = useAuth();
  const { businessName } = useAdminContext();
  const { toast } = useToast();
  
  const [passwords, setPasswords] = useState({ new: '', confirm: '' });
  const [passwordLoading, setPasswordLoading] = useState(false);
  
  // Feedback Modal State
  const [feedbackModalOpen, setFeedbackModalOpen] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [feedbackImages, setFeedbackImages] = useState([]);

  // 🟢 MOBİL GERİ TUŞU: Feedback Modal
  useEffect(() => {
    if (!feedbackModalOpen) return;

    const handlePopState = () => {
      console.log('🔙 Geri tuşu: Feedback modal kapatılıyor');
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
      toast({ variant: "destructive", title: "Hata", description: "Şifreler eşleşmiyor." });
      return;
    }
    if (passwords.new.length < 6) {
      toast({ variant: "destructive", title: "Hata", description: "Şifre en az 6 karakter olmalı." });
      return;
    }

    setPasswordLoading(true);
    const { error } = await supabase.auth.updateUser({ password: passwords.new });
    setPasswordLoading(false);

    if (error) {
      toast({ variant: "destructive", title: "Hata", description: error.message });
    } else {
      toast({ title: "Başarılı", description: "Şifreniz güncellendi." });
      setPasswords({ new: '', confirm: '' });
    }
  };

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);
    const remainingSlots = 3 - feedbackImages.length;
    
    if (files.length > remainingSlots) {
      toast({
        title: "Uyarı",
        description: "En fazla 3 görsel ekleyebilirsiniz.",
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
      toast({ variant: "destructive", title: "Hata", description: "Oturum açmanız gerekiyor." });
      return;
    }
    if (!feedbackMessage.trim()) {
      toast({ variant: "destructive", title: "Hata", description: "Lütfen mesajınızı yazın." });
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
        title: "Geri Bildirim Alındı",
        description: "Geri bildiriminiz için teşekkür ederiz.",
        className: "bg-teal-600 text-white border-none"
      });
      setFeedbackMessage('');
      setFeedbackImages([]);
      setFeedbackModalOpen(false);
    } catch (error) {
      console.error('Feedback submit error:', error);
      toast({ variant: "destructive", title: "Hata", description: "Geri bildirim gönderilemedi." });
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
    <div className="max-w-3xl mx-auto space-y-8 pt-16 md:pt-0 pb-10">
      <div className="flex justify-center md:justify-start">
        <h1 className="text-2xl font-bold text-white">Ayarlar</h1>
      </div>

      {/* Profile Section */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-800">
          <User className="w-5 h-5 text-blue-400" />
          <h2 className="text-lg font-semibold text-white">Profil Bilgileri</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-sm text-slate-400">E-posta Adresi</label>
            <Input value={user?.email || ''} disabled className="bg-slate-950 border-slate-800 text-slate-500" />
          </div>
          <div className="space-y-2">
            <label className="text-sm text-slate-400">İşletme Adı</label>
            <Input value={businessName} disabled className="bg-slate-950 border-slate-800 text-slate-500" />
          </div>
        </div>
      </div>

      {/* Password Section */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-800">
          <Lock className="w-5 h-5 text-orange-400" />
          <h2 className="text-lg font-semibold text-white">Şifre Değiştir</h2>
        </div>
        <form onSubmit={handlePasswordUpdate} className="space-y-4 max-w-md">
          <div className="space-y-2">
            <label className="text-sm text-slate-400">Yeni Şifre</label>
            <Input 
              type="password" 
              value={passwords.new}
              onChange={(e) => setPasswords({...passwords, new: e.target.value})}
              className="bg-slate-800 border-slate-700 text-white"
              placeholder="••••••••"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm text-slate-400">Yeni Şifre (Tekrar)</label>
            <Input 
              type="password" 
              value={passwords.confirm}
              onChange={(e) => setPasswords({...passwords, confirm: e.target.value})}
              className="bg-slate-800 border-slate-700 text-white"
              placeholder="••••••••"
            />
          </div>
          <Button disabled={passwordLoading} type="submit" className="w-full bg-teal-600 hover:bg-teal-700 text-white">
            {passwordLoading ? "Güncelleniyor..." : <><Save className="w-4 h-4 mr-2" /> Şifreyi Güncelle</>}
          </Button>
        </form>
      </div>

      {/* Vocalize Feedback Section */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-800">
          <MessageSquare className="w-5 h-5 text-purple-400" />
          <h2 className="text-lg font-semibold text-white">Vocalize Ekibine Geri Bildirim Gönderin</h2>
        </div>
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <p className="text-slate-400 text-sm max-w-lg">
            Vocalize deneyiminizi iyileştirmek için öneri, şikayet veya taleplerinizi doğrudan bize iletebilirsiniz. Geri bildirimleriniz bizim için değerlidir.
          </p>
          <Button onClick={() => setFeedbackModalOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white whitespace-nowrap">
            <MessageSquare className="w-4 h-4 mr-2" />
            Geri Bildirim Gönder
          </Button>
        </div>
      </div>

      {/* 🟢 GÜNCELLENMIŞ MODAL (onOpenChange kullanımı) */}
      <Dialog open={feedbackModalOpen} onOpenChange={handleCloseModal}>
        <DialogContent className="sm:max-w-[500px] bg-slate-900 border-slate-800 text-white">
          <DialogHeader>
            <DialogTitle className="text-white">Vocalize Ekibiyle İletişim</DialogTitle>
            <DialogDescription className="text-slate-400">
              Görüşlerinizi, önerilerinizi veya yaşadığınız sorunları bizimle paylaşın.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleFeedbackSubmit} className="grid gap-4 py-4">
            <div className="grid gap-2">
              <label htmlFor="feedback-message" className="text-sm font-medium text-slate-200">Mesajınız *</label>
              <textarea
                id="feedback-message"
                rows="4"
                placeholder="Fikirlerinizi buraya yazın..."
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
                  Görseller (Opsiyonel)
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
                    <span className="text-[10px] text-slate-500">Yükle</span>
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
                Gönder
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SettingsPage;
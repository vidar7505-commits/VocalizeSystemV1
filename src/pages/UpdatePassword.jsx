import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/customSupabaseClient';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, Lock, Eye, EyeOff } from 'lucide-react';

const LOGO_URL = "https://horizons-cdn.hostinger.com/b40913c4-5edd-44d9-8d18-8065daa4eea8/0a0619d3f364e3caf7bb54245ea8f02d.png";

export default function UpdatePassword() {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Supabase, URL'deki token'ı otomatik algılar ve oturumu açar.
    // Biz sadece kullanıcının gerçekten oturum açıp açmadığını kontrol edelim.
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        // Eğer session yoksa, link geçersizdir veya süresi dolmuştur.
        toast({
          variant: "destructive",
          title: "Geçersiz Bağlantı",
          description: "Şifre sıfırlama bağlantısının süresi dolmuş veya geçersiz."
        });
        navigate('/');
      }
    });
  }, [navigate, toast]);

  const handleUpdate = async (e) => {
    e.preventDefault();
    
    if (password.length < 6) {
      toast({
        variant: "destructive",
        title: "Hata",
        description: "Şifre en az 6 karakter olmalıdır."
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ 
        password: password 
      });

      if (error) throw error;

      toast({
        title: "Başarılı",
        description: "Şifreniz başarıyla güncellendi. Yönlendiriliyorsunuz...",
        className: "bg-teal-600 text-white border-none"
      });

      // Başarılı olursa 2 saniye sonra ana sayfaya at
      setTimeout(() => {
        navigate('/');
      }, 2000);

    } catch (error) {
      toast({
        variant: "destructive",
        title: "Hata",
        description: error.message || "Şifre güncellenemedi."
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0f172a] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl">
        
        {/* Header */}
        <div className="flex flex-col items-center mb-8">
          <img src={LOGO_URL} alt="Vocalize" className="h-16 w-auto mb-4 object-contain" />
          <h1 className="text-2xl font-bold text-white">Yeni Şifre Belirle</h1>
          <p className="text-slate-400 text-sm mt-2 text-center">
            Lütfen hesabınız için yeni ve güvenli bir şifre girin.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleUpdate} className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-300 ml-1">Yeni Şifre</label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
              <Input
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-10 pr-10 h-11 bg-slate-800 border-slate-700 text-white focus-visible:ring-teal-500 transition-all"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3 text-slate-500 hover:text-slate-300 transition-colors"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <Button 
            type="submit" 
            disabled={loading} 
            className="w-full h-11 bg-teal-600 hover:bg-teal-700 text-white font-bold transition-all"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Güncelleniyor...
              </>
            ) : (
              'Şifreyi Güncelle'
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}
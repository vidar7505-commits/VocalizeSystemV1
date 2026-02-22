import * as React from 'react';
import { useState } from 'react';
import { MessageCircle, ImageIcon, X, Loader2, Send } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import { cn } from '@/lib/utils';

const SupportModal = React.memo(({
    isOpen,
    onOpenChange,
    user,
    t,
    language,
}) => {
    const { toast } = useToast();
    const [supportMessage, setSupportMessage] = useState('');
    const [supportEmail, setSupportEmail] = useState(user?.email || '');
    const [supportLoading, setSupportLoading] = useState(false);
    const [supportImages, setSupportImages] = useState([]);

    const handleSupportImageChange = (e) => {
        const files = Array.from(e.target.files);
        if (files.length + supportImages.length > 3) {
            toast({
                title: t.support.errorTitle,
                description: t.support.maxImages,
                variant: "destructive"
            });
            return;
        }
        setSupportImages([...supportImages, ...files]);
    };

    const removeImage = (index) => {
        setSupportImages(prev => prev.filter((_, i) => i !== index));
    };

    const uploadImages = async () => {
        const uploadedUrls = [];
        for (const file of supportImages) {
            const fileName = `support/${Date.now()}_${Math.random().toString(36).substr(2, 9)}_${file.name.replace(/[^a-zA-Z0-9.]/g, '')}`;
            const { error } = await supabase.storage.from('feedback-images').upload(fileName, file);
            if (!error) {
                const { data: { publicUrl } } = supabase.storage.from('feedback-images').getPublicUrl(fileName);
                uploadedUrls.push(publicUrl);
            }
        }
        return uploadedUrls;
    };

    const handleSupportSubmit = async (e) => {
        e.preventDefault();
        if (!supportMessage.trim()) {
            toast({
                title: t.support.errorTitle,
                description: t.support.errorEmpty,
                variant: "destructive"
            });
            return;
        }
        setSupportLoading(true);
        try {
            const imageUrls = await uploadImages();
            const { error } = await supabase.from('vocalize_support_tickets').insert({
                email: supportEmail,
                message: supportMessage,
                images: imageUrls,
                origin: 'customer_panel'
            });
            if (error) throw error;
            toast({
                title: t.support.successTitle,
                description: t.support.successDesc,
                className: "bg-teal-600 text-white border-none"
            });
            onOpenChange(false);
            setSupportMessage('');
            setSupportImages([]);
        } catch (err) {
            toast({
                title: t.support.errorTitle,
                description: t.support.errorDesc,
                variant: "destructive"
            });
        } finally {
            setSupportLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px] bg-slate-800 border-slate-700 text-white rounded-xl p-6 shadow-2xl">
                <DialogHeader>
                    <DialogTitle className="text-white text-xl font-bold flex items-center gap-2">
                        <MessageCircle className="h-5 w-5 text-teal-500" />
                        {t.support.title}
                    </DialogTitle>
                    <DialogDescription className="text-slate-400">
                        {t.support.description}
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSupportSubmit} className="grid gap-6 py-4">
                    <div className="grid gap-2">
                        <label htmlFor="support-email" className="text-sm font-medium text-slate-300">
                            {t.support.email} <span className="text-red-500">*</span>
                        </label>
                        <Input
                            id="support-email"
                            type="email"
                            placeholder="ornek@sirket.com"
                            value={supportEmail}
                            onChange={(e) => setSupportEmail(e.target.value)}
                            disabled={!!user?.email}
                            className={cn("bg-slate-900 border-slate-700 text-white rounded-lg h-11", !!user?.email && "opacity-70 cursor-not-allowed")}
                            required
                        />
                    </div>
                    <div className="grid gap-2">
                        <label htmlFor="support-message" className="text-sm font-medium text-slate-300">
                            {t.support.message} <span className="text-red-500">*</span>
                        </label>
                        <textarea
                            id="support-message"
                            rows="6"
                            placeholder={t.support.messagePlaceholder}
                            value={supportMessage}
                            onChange={(e) => setSupportMessage(e.target.value)}
                            className="w-full rounded-lg border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50 resize-none transition-colors"
                            required
                        />
                    </div>
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <label className="text-sm font-medium text-slate-300 flex items-center gap-2">
                                <ImageIcon className="w-4 h-4 text-teal-500" />
                                {t.support.images}
                            </label>
                            <span className="text-xs text-slate-500 bg-slate-900 px-2 py-1 rounded-md border border-slate-800">
                                {supportImages.length}/3
                            </span>
                        </div>
                        <div className="flex flex-wrap gap-3">
                            {supportImages.map((file, idx) => (
                                <div key={idx} className="relative w-20 h-20 rounded-lg overflow-hidden border border-slate-700 group">
                                    <img
                                        src={URL.createObjectURL(file)}
                                        alt="preview"
                                        className="w-full h-full object-cover transition-transform group-hover:scale-110"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => removeImage(idx)}
                                        className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                </div>
                            ))}
                            {supportImages.length < 3 && (
                                <label className="w-20 h-20 rounded-lg border-2 border-dashed border-slate-700 flex flex-col items-center justify-center cursor-pointer hover:border-teal-500/50 hover:bg-teal-500/5 transition-all text-slate-500 hover:text-teal-400">
                                    <Loader2 className="w-6 h-6 mb-1" />
                                    <span className="text-[10px] font-medium">{t.support.upload}</span>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        multiple
                                        className="hidden"
                                        onChange={handleSupportImageChange}
                                    />
                                </label>
                            )}
                        </div>
                    </div>
                    <Button
                        type="submit"
                        disabled={supportLoading}
                        className="w-full bg-gradient-to-r from-teal-600 to-teal-500 hover:from-teal-500 hover:to-teal-400 text-white font-bold h-12 shadow-lg shadow-teal-900/20 transition-all active:scale-[0.98]"
                    >
                        {supportLoading ? (
                            <>
                                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                {t.support.sending}
                            </>
                        ) : (
                            <>
                                <Send className="mr-2 h-5 w-5" />
                                {t.support.send}
                            </>
                        )}
                    </Button>
                </form>
            </DialogContent>
        </Dialog>
    );
});

export default SupportModal;

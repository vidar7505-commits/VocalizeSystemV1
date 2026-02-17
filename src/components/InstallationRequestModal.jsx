import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/lib/customSupabaseClient";
import { Loader2, Building2, User, Mail, Phone, Briefcase, MessageSquare } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function InstallationRequestModal({ isOpen, onClose, initialSector = '' }) {
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const SECTORS = [
    { key: "cafe", label: t('customer.installRequest.sectors.cafe') },
    { key: "bakery", label: t('customer.installRequest.sectors.bakery') },
    { key: "hotel", label: t('customer.installRequest.sectors.hotel') },
    { key: "beauty", label: t('customer.installRequest.sectors.beauty') },
    { key: "health", label: t('customer.installRequest.sectors.health') },
    { key: "retail", label: t('customer.installRequest.sectors.retail') },
    { key: "sports", label: t('customer.installRequest.sectors.sports') },
    { key: "education", label: t('customer.installRequest.sectors.education') },
    { key: "franchise", label: t('customer.installRequest.sectors.franchise') },
    { key: "other", label: t('customer.installRequest.sectors.other') }
  ];

  const [formData, setFormData] = useState({
    companyName: '',
    sector: '',
    fullName: '',
    email: '',
    phone: '',
    position: '',
    note: ''
  });

  // Set initial sector when modal opens
  React.useEffect(() => {
    if (isOpen && initialSector) {
      setFormData(prev => ({ ...prev, sector: initialSector }));
    }
  }, [isOpen, initialSector]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSectorChange = (value) => {
    setFormData(prev => ({ ...prev, sector: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    // Validation
    if (!formData.companyName || !formData.sector || !formData.fullName || !formData.email) {
      toast({
        title: t('common.error'),
        description: t('common.validation.fillRequired'),
        variant: "destructive"
      });
      setIsLoading(false);
      return;
    }

    try {
      const combinedMessage = `
Pozisyon: ${formData.position || 'Belirtilmedi'}
Not: ${formData.note || 'Yok'}
      `.trim();

      const { error } = await supabase.from('vocalize_leads').insert({
        company_name: formData.companyName,
        sector: formData.sector,
        name: formData.fullName,
        email: formData.email,
        phone: formData.phone || null,
        message: combinedMessage,
        lead_type: 'installation_request',
        source: 'landing_page_modal',
        lead_score: 20
      });

      if (error) throw error;

      toast({
        title: t('customer.installRequest.successTitle'),
        description: t('customer.installRequest.successDesc'),
        className: "bg-teal-600 text-white border-none"
      });

      // Reset form and close
      setFormData({
        companyName: '',
        sector: '',
        fullName: '',
        email: '',
        phone: '',
        position: '',
        note: ''
      });
      onClose();

    } catch (error) {
      console.error('Lead submission error:', error);
      toast({
        title: t('common.error'),
        description: t('customer.support.errorDesc'),
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Logic to detect "Diğer" selection
  const isOtherSelected = formData.sector === t('customer.installRequest.sectors.other') || formData.companyName.trim().toLowerCase() === 'diğer';

  const notePlaceholder = isOtherSelected
    ? t('customer.installRequest.otherNotePlaceholder')
    : t('customer.installRequest.notePlaceholder');

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] bg-[#0f172a] border-slate-700 text-white max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-white flex items-center gap-2">
            <Building2 className="w-5 h-5 text-orange-500" />
            {t('customer.installRequest.title')}
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            {t('customer.installRequest.description')}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="companyName" className="text-slate-200 text-xs uppercase font-semibold tracking-wider">{t('customer.installRequest.companyName')} <span className="text-red-500">*</span></Label>
              <div className="relative">
                <Building2 className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                <Input
                  id="companyName"
                  name="companyName"
                  placeholder={t('customer.installRequest.companyNamePlaceholder')}
                  value={formData.companyName}
                  onChange={handleInputChange}
                  className="pl-9 bg-slate-800 border-slate-700 focus-visible:ring-orange-500"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="sector" className="text-slate-200 text-xs uppercase font-semibold tracking-wider">{t('customer.installRequest.sector')} <span className="text-red-500">*</span></Label>
              <Select onValueChange={handleSectorChange} value={formData.sector} required>
                <SelectTrigger className="bg-slate-800 border-slate-700 focus:ring-orange-500 text-white">
                  <SelectValue placeholder={t('customer.installRequest.sectorPlaceholder')}>
                    {formData.sector}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700 text-white">
                  {SECTORS.map((sector) => (
                    <SelectItem key={sector.key} value={sector.label} className="focus:bg-slate-700 focus:text-white cursor-pointer">
                      {sector.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="fullName" className="text-slate-200 text-xs uppercase font-semibold tracking-wider">{t('customer.installRequest.fullName')} <span className="text-red-500">*</span></Label>
            <div className="relative">
              <User className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
              <Input
                id="fullName"
                name="fullName"
                placeholder={t('customer.installRequest.fullNamePlaceholder')}
                value={formData.fullName}
                onChange={handleInputChange}
                className="pl-9 bg-slate-800 border-slate-700 focus-visible:ring-orange-500"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-slate-200 text-xs uppercase font-semibold tracking-wider">{t('customer.installRequest.email')} <span className="text-red-500">*</span></Label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder={t('customer.installRequest.emailPlaceholder')}
                  value={formData.email}
                  onChange={handleInputChange}
                  className="pl-9 bg-slate-800 border-slate-700 focus-visible:ring-orange-500"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone" className="text-slate-200 text-xs uppercase font-semibold tracking-wider">{t('customer.installRequest.phone')}</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                <Input
                  id="phone"
                  name="phone"
                  type="tel"
                  placeholder={t('customer.installRequest.phonePlaceholder')}
                  value={formData.phone}
                  onChange={handleInputChange}
                  className="pl-9 bg-slate-800 border-slate-700 focus-visible:ring-orange-500"
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="position" className="text-slate-200 text-xs uppercase font-semibold tracking-wider">{t('customer.installRequest.position')}</Label>
            <div className="relative">
              <Briefcase className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
              <Input
                id="position"
                name="position"
                placeholder={t('customer.installRequest.positionPlaceholder')}
                value={formData.position}
                onChange={handleInputChange}
                className="pl-9 bg-slate-800 border-slate-700 focus-visible:ring-orange-500"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="note" className="text-slate-200 text-xs uppercase font-semibold tracking-wider">{t('customer.installRequest.note')}</Label>
            <div className="relative">
              <MessageSquare className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
              <Textarea
                id="note"
                name="note"
                rows={3}
                placeholder={notePlaceholder}
                value={formData.note}
                onChange={handleInputChange}
                className="pl-9 bg-slate-800 border-slate-700 focus-visible:ring-orange-500 text-white h-24 overflow-y-auto resize-none"
              />
            </div>
          </div>

          <DialogFooter className="mt-4 pt-2 border-t border-slate-800">
            <Button type="button" variant="ghost" onClick={onClose} className="text-slate-400 hover:text-white hover:bg-slate-800">
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={isLoading} className="bg-orange-500 hover:bg-orange-600 text-white min-w-[120px]">
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t('common.sending')}
                </>
              ) : (
                t('customer.installRequest.submit')
              )}
            </Button>
          </DialogFooter>

        </form>
      </DialogContent>
    </Dialog>
  );
}
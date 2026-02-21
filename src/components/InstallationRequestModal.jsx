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

const getSectors = (t) => [
  t('installation_request.sectors.cafe_restaurant'),
  t('installation_request.sectors.bakery_pastry'),
  t('installation_request.sectors.hotel_accommodation'),
  t('installation_request.sectors.beauty_care'),
  t('installation_request.sectors.health_clinic'),
  t('installation_request.sectors.retail_shopping'),
  t('installation_request.sectors.sports_fitness'),
  t('installation_request.sectors.education'),
  t('installation_request.sectors.franchise'),
  t('installation_request.sectors.other')
];

export default function InstallationRequestModal({ isOpen, onClose, initialSector = '' }) {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { t } = useTranslation('admin');
  const SECTORS = getSectors(t);

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
        title: t('installation_request.error_missing_fields'),
        variant: "destructive"
      });
      setIsLoading(false);
      return;
    }

    try {
      const combinedMessage = `
${t('installation_request.position')}: ${formData.position || (t('common.not_specified', { defaultValue: 'Belirtilmedi' }))}
${t('installation_request.note')}: ${formData.note || (t('common.none', { defaultValue: 'Yok' }))}
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
        title: t('installation_request.success_title'),
        description: t('installation_request.success_desc'),
        className: "bg-green-600 text-white border-none"
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
        title: t('installation_request.error_generic'),
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Logic to detect "Diğer" selection
  const isOtherSelected = formData.sector === t('installation_request.sectors.other') || formData.companyName.trim().toLowerCase() === t('installation_request.sectors.other').toLowerCase();

  const notePlaceholder = isOtherSelected
    ? t('installation_request.note_placeholder_other')
    : t('installation_request.note_placeholder_default');

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] bg-[#0f172a] border-slate-700 text-white max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-white flex items-center gap-2">
            <Building2 className="w-5 h-5 text-orange-500" />
            {t('installation_request.title')}
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            {t('installation_request.subtitle')}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="companyName" className="text-slate-200 text-xs uppercase font-semibold tracking-wider">{t('installation_request.company_name')} <span className="text-red-500">*</span></Label>
              <div className="relative">
                <Building2 className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                <Input
                  id="companyName"
                  name="companyName"
                  placeholder={t('installation_request.company_name_placeholder')}
                  value={formData.companyName}
                  onChange={handleInputChange}
                  className="pl-9 bg-slate-800 border-slate-700 focus-visible:ring-orange-500"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="sector" className="text-slate-200 text-xs uppercase font-semibold tracking-wider">{t('installation_request.sector')} <span className="text-red-500">*</span></Label>
              <Select onValueChange={handleSectorChange} value={formData.sector} required>
                <SelectTrigger className="bg-slate-800 border-slate-700 focus:ring-orange-500 text-white">
                  <SelectValue placeholder={t('installation_request.sector_placeholder')}>
                    {formData.sector}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700 text-white">
                  {SECTORS.map((sector) => (
                    <SelectItem key={sector} value={sector} className="focus:bg-slate-700 focus:text-white cursor-pointer">
                      {sector}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="fullName" className="text-slate-200 text-xs uppercase font-semibold tracking-wider">{t('installation_request.full_name')} <span className="text-red-500">*</span></Label>
            <div className="relative">
              <User className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
              <Input
                id="fullName"
                name="fullName"
                placeholder={t('installation_request.full_name_placeholder')}
                value={formData.fullName}
                onChange={handleInputChange}
                className="pl-9 bg-slate-800 border-slate-700 focus-visible:ring-orange-500"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-slate-200 text-xs uppercase font-semibold tracking-wider">{t('installation_request.email')} <span className="text-red-500">*</span></Label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder={t('installation_request.email_placeholder')}
                  value={formData.email}
                  onChange={handleInputChange}
                  className="pl-9 bg-slate-800 border-slate-700 focus-visible:ring-orange-500"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone" className="text-slate-200 text-xs uppercase font-semibold tracking-wider">{t('installation_request.phone')}</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                <Input
                  id="phone"
                  name="phone"
                  type="tel"
                  placeholder={t('installation_request.phone_placeholder')}
                  value={formData.phone}
                  onChange={handleInputChange}
                  className="pl-9 bg-slate-800 border-slate-700 focus-visible:ring-orange-500"
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="position" className="text-slate-200 text-xs uppercase font-semibold tracking-wider">{t('installation_request.position')}</Label>
            <div className="relative">
              <Briefcase className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
              <Input
                id="position"
                name="position"
                placeholder={t('installation_request.position_placeholder')}
                value={formData.position}
                onChange={handleInputChange}
                className="pl-9 bg-slate-800 border-slate-700 focus-visible:ring-orange-500"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="note" className="text-slate-200 text-xs uppercase font-semibold tracking-wider">{t('installation_request.note')}</Label>
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
              {t('installation_request.cancel')}
            </Button>
            <Button type="submit" disabled={isLoading} className="bg-orange-500 hover:bg-orange-600 text-white min-w-[120px]">
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t('installation_request.submitting')}
                </>
              ) : (
                t('installation_request.submit')
              )}
            </Button>
          </DialogFooter>

        </form>
      </DialogContent>
    </Dialog>
  );
}
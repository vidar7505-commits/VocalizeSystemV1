import * as React from 'react';
import { AlertTriangle, Trash2, Loader2 } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';

const DeleteAccountModal = ({
    isOpen,
    onOpenChange,
    language,
    deleteAccountConfirmed,
    setDeleteAccountConfirmed,
    handleSoftDeleteAccount,
    isDeletingAccount,
}) => {
    return (
        <Dialog open={isOpen} onOpenChange={(open) => {
            onOpenChange(open);
            if (!open) setDeleteAccountConfirmed(false);
        }}>
            <DialogContent className="bg-slate-900 border-red-500/50 text-white max-w-md rounded-xl shadow-2xl shadow-red-900/20">
                <DialogHeader>
                    <DialogTitle className="text-red-500 flex items-center gap-2 text-xl">
                        <AlertTriangle className="h-6 w-6" />
                        {language === 'tr' ? 'Hesabınızı Silmek Üzeresiniz' : 'You Are About To Delete Your Account'}
                    </DialogTitle>
                    <DialogDescription className="text-slate-300 mt-2">
                        {language === 'tr'
                            ? 'Bu işlem geri alınamaz. Hesabınız silindiğinde tüm geri bildirim geçmişiniz, profil bilgileriniz ve ayarlarınız kalıcı olarak silinecektir.'
                            : 'This action cannot be undone. All your feedback history, profile information, and settings will be permanently deleted.'}
                    </DialogDescription>
                </DialogHeader>

                <div className="py-4">
                    <div className="flex items-start gap-3 bg-red-950/30 p-4 rounded-lg border border-red-900/50">
                        <Checkbox
                            id="finalDeleteConfirm"
                            checked={deleteAccountConfirmed}
                            onCheckedChange={setDeleteAccountConfirmed}
                            className="mt-1 border-red-400 data-[state=checked]:bg-red-500 data-[state=checked]:text-white"
                        />
                        <label htmlFor="finalDeleteConfirm" className="text-sm text-red-200 cursor-pointer leading-tight">
                            {language === 'tr'
                                ? 'Sonuçları anlıyorum ve hesabımı kalıcı olarak silmeyi onaylıyorum.'
                                : 'I understand the consequences and confirm the permanent deletion of my account.'}
                        </label>
                    </div>
                </div>

                <DialogFooter className="gap-2 sm:gap-0">
                    <Button
                        onClick={() => onOpenChange(false)}
                        variant="outline"
                        className="bg-slate-700 border-slate-600 hover:bg-slate-600 text-white"
                    >
                        {language === 'tr' ? 'Vazgeç' : 'Cancel'}
                    </Button>
                    <Button
                        onClick={handleSoftDeleteAccount}
                        disabled={isDeletingAccount || !deleteAccountConfirmed}
                        className="bg-red-600 hover:bg-red-700 text-white font-bold"
                    >
                        {isDeletingAccount ? (
                            <>
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                {language === 'tr' ? 'Siliniyor...' : 'Deleting...'}
                            </>
                        ) : (
                            <>
                                <Trash2 className="h-4 w-4 mr-2" />
                                {language === 'tr' ? 'Evet, Hesabımı Sil' : 'Yes, Delete My Account'}
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default DeleteAccountModal;

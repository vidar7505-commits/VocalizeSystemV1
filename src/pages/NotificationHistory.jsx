import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { MessageSquare, Trash2, Check, Eye, EyeOff, Loader2, ServerCrash, Inbox, ChevronLeft, ChevronRight } from 'lucide-react';
import AdminMobileNavbar from '@/components/AdminMobileNavbar';
import FeedbackDetailModal from '@/components/FeedbackDetailModal';
import { useTranslation } from 'react-i18next';
import { formatDistanceToNow } from 'date-fns';
import { tr, enUS } from 'date-fns/locale';

const NotificationHistory = () => {
    const { t, i18n } = useTranslation();
    const { user } = useAuth();
    const { toast } = useToast();
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selected, setSelected] = useState([]);
    const [filter, setFilter] = useState('all'); // 'all', 'read', 'unread'
    const [page, setPage] = useState(1);
    const [itemsPerPage] = useState(20);
    const [totalCount, setTotalCount] = useState(0);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    
    // Feedback Detail State
    const [selectedFeedback, setSelectedFeedback] = useState(null);
    const [isLoadingFeedback, setIsLoadingFeedback] = useState(false);

    const totalPages = Math.ceil(totalCount / itemsPerPage);

    const fetchNotifications = useCallback(async () => {
        if (!user) return;
        setLoading(true);
        setError(null);
        try {
            const from = (page - 1) * itemsPerPage;
            const to = from + itemsPerPage - 1;

            let query = supabase
                .from('notifications')
                .select('*, feedbacks(feedback_type)', { count: 'exact' })
                .eq('user_id', user.id);

            if (filter === 'read') query = query.eq('is_read', true);
            if (filter === 'unread') query = query.eq('is_read', false);

            query = query.order('created_at', { ascending: false }).range(from, to);

            let res = await query;
            if (res.error) {
                // Join hatası olabilir (örn. feedback_id/related_id FK farklıysa); join olmadan dene
                let fallback = supabase.from('notifications').select('*', { count: 'exact' }).eq('user_id', user.id);
                if (filter === 'read') fallback = fallback.eq('is_read', true);
                if (filter === 'unread') fallback = fallback.eq('is_read', false);
                fallback = fallback.order('created_at', { ascending: false }).range(from, to);
                res = await fallback;
            }
            if (res.error) throw res.error;

            setNotifications(res.data || []);
            setTotalCount(res.count ?? 0);

        } catch (e) {
            console.error("Error fetching notification history:", e);
            setError(t('admin.notifications.fetchError'));
            toast({ variant: 'destructive', title: t('common.error'), description: t('admin.notifications.fetchError') });
        } finally {
            setLoading(false);
            setSelected([]);
        }
    }, [user, toast, filter, page, itemsPerPage, t]);

    const getNotificationLabel = (n) => {
        const type = n.feedbacks?.feedback_type || n.feedback_type;
        if (type === 'complaint') return t('admin.header.newComplaint');
        if (type === 'suggestion') return t('admin.header.newSuggestion');
        if (type === 'evaluation' || type === 'review' || type === 'rating') return t('admin.header.newEvaluation');
        return n.message || t('admin.header.newNotification');
    };

    useEffect(() => {
        fetchNotifications();
    }, [fetchNotifications]);
    
    const handleBulkUpdate = async (updateData) => {
        try {
            const { error } = await supabase.from('notifications').update(updateData).in('id', selected);
            if (error) throw error;
            toast({ title: t('common.success'), description: t('admin.notifications.updateSuccess', { count: selected.length }) });
            await fetchNotifications();
        } catch (error) { toast({ variant: "destructive", title: t('common.error'), description: t('admin.notifications.updateError') }); }
    };

    const handleBulkDelete = async () => {
        try {
            const { error } = await supabase.from('notifications').delete().in('id', selected);
            if (error) throw error;
            toast({ title: t('common.success'), description: t('admin.notifications.deleteSuccess', { count: selected.length }) });
            await fetchNotifications();
        } catch (error) { toast({ variant: "destructive", title: t('common.error'), description: t('admin.notifications.deleteError') }); }
        setIsDeleteModalOpen(false);
    };
    
    const handleNotificationClick = async (notification) => {
        const feedbackId = notification.related_id || notification.feedback_id;
        if (!feedbackId) return;
        
        // Mark as read immediately if unread
        if (!notification.is_read) {
            try {
                await supabase.from('notifications').update({ is_read: true }).eq('id', notification.id);
                // Optimistically update local state
                setNotifications(prev => prev.map(n => n.id === notification.id ? { ...n, is_read: true } : n));
            } catch (err) {
                console.error("Error marking notification read:", err);
            }
        }

        // Fetch feedback details
        setIsLoadingFeedback(true);
        try {
            const { data, error } = await supabase
                .from('feedbacks')
                .select(`
                  *,
                  feedback_images,
                  image_urls,
                  receipt_images,
                  receipt_url,
                  product_image_url,
                  branches (id, branch_name_tr),
                  customer_profiles (
                    id,
                    name,
                    email,
                    phone,
                    flag_vip_customer,
                    flag_sensitive_customer,
                    admin_note,
                    users (
                      first_name,
                      last_name
                    )
                  ),
                  manager_note_updater:manager_note_updated_by (
                    first_name,
                    last_name
                  )
                `)
                .eq('id', feedbackId)
                .single();
            
            if (error) throw error;
            setSelectedFeedback(data);
        } catch (err) {
            console.error("Error fetching feedback details:", err);
            toast({ variant: "destructive", title: t('common.error'), description: t('admin.feedbacks.fetchErrorDesc') });
        } finally {
            setIsLoadingFeedback(false);
        }
    };

    const handleSelectAll = (checked) => setSelected(checked ? notifications.map(n => n.id) : []);

    const isAllSelected = selected.length > 0 && selected.length === notifications.length;

    return (
        <div className="mx-auto max-w-7xl pb-10 px-4 pt-20 md:px-6 md:pt-0 lg:px-8 relative">
            <AdminMobileNavbar />
            
            {isLoadingFeedback && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center backdrop-blur-sm">
                    <div className="bg-slate-900 p-6 rounded-lg border border-slate-700 flex flex-col items-center gap-3">
                        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
                        <span className="text-slate-300 font-medium">{t('admin.notifications.detailsLoading')}</span>
                    </div>
                </div>
            )}

            <header className="mb-6 mt-4 md:mt-0 flex flex-col md:flex-row justify-between items-start gap-3">
                <div>
                    <h1 className="text-white font-bold text-3xl">{t('admin.notifications.title')}</h1>
                    <p className="text-slate-400 text-sm">{t('admin.notifications.subtitle')}</p>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant={filter === 'all' ? 'default' : 'outline'} onClick={() => { setFilter('all'); setPage(1); }} size="sm" className="bg-slate-700 hover:bg-slate-600 border-slate-600">{t('admin.notifications.all')}</Button>
                    <Button variant={filter === 'unread' ? 'default' : 'outline'} onClick={() => { setFilter('unread'); setPage(1); }} size="sm" className="bg-slate-700 hover:bg-slate-600 border-slate-600">{t('admin.notifications.unread')}</Button>
                    <Button variant={filter === 'read' ? 'default' : 'outline'} onClick={() => { setFilter('read'); setPage(1); }} size="sm" className="bg-slate-700 hover:bg-slate-600 border-slate-600">{t('admin.notifications.read')}</Button>
                </div>
            </header>

            {selected.length > 0 && (
                <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-3 md:p-4 mb-4 flex flex-col md:flex-row items-center justify-between gap-4">
                    <div><span className="text-blue-400 font-medium">{t('admin.notifications.selectedCount', { count: selected.length })}</span><Button variant="link" className="text-blue-400 hover:text-blue-300 text-sm" onClick={() => setSelected([])}>{t('common.deselectAll')}</Button></div>
                    <div className="flex items-center gap-2">
                        <Button size="sm" onClick={() => handleBulkUpdate({ is_read: true })} className="bg-blue-600 hover:bg-blue-700"><Eye className="w-4 h-4 mr-2"/>{t('admin.notifications.markAsRead')}</Button>
                        <Button size="sm" onClick={() => handleBulkUpdate({ is_read: false })} className="bg-purple-600 hover:bg-purple-700"><EyeOff className="w-4 h-4 mr-2"/>{t('admin.notifications.markAsUnread')}</Button>
                        <Button size="sm" onClick={() => setIsDeleteModalOpen(true)} className="bg-red-600 hover:bg-red-700"><Trash2 className="w-4 h-4 mr-2"/>{t('admin.notifications.delete')}</Button>
                    </div>
                </div>
            )}
            
            <div className="bg-slate-800/40 rounded-lg border border-slate-700/50 overflow-x-auto">
                <table className="w-full min-w-[800px] text-left">
                    <thead className="bg-slate-700/50">
                        <tr>
                            <th className="p-4 w-12"><Checkbox checked={isAllSelected} onCheckedChange={handleSelectAll} id="select-all"/></th>
                            <th className="px-3 py-4 text-sm font-semibold text-slate-300">{t('admin.notifications.status')}</th>
                            <th className="px-3 py-4 text-sm font-semibold text-slate-300 w-1/2">{t('admin.notifications.message')}</th>
                            <th className="px-3 py-4 text-sm font-semibold text-slate-300">{t('admin.notifications.branch')}</th>
                            <th className="px-3 py-4 text-sm font-semibold text-slate-300">{t('admin.notifications.date')}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            [...Array(10)].map((_, i) => <tr key={i}><td colSpan="5" className="p-2"><div className="h-12 bg-slate-700/50 rounded-lg animate-pulse"></div></td></tr>)
                        ) : error ? (
                             <tr><td colSpan="5" className="text-center py-16"><ServerCrash className="w-12 h-12 text-red-500/50 mx-auto mb-4" /><p className="text-slate-400">{error}</p></td></tr>
                        ) : notifications.length === 0 ? (
                            <tr><td colSpan="5" className="text-center py-16"><Inbox className="w-12 h-12 text-slate-600 mx-auto mb-4" /><p className="text-slate-400">{t('admin.notifications.noNotifications')}</p></td></tr>
                        ) : (
                            notifications.map(n => (
                                <tr 
                                    key={n.id} 
                                    className={`border-b border-slate-700/30 transition-colors cursor-pointer ${selected.includes(n.id) ? 'bg-blue-900/20' : 'hover:bg-slate-700/40'}`}
                                    onClick={() => handleNotificationClick(n)}
                                >
                                    <td className="p-4" onClick={(e) => e.stopPropagation()}>
                                        <Checkbox checked={selected.includes(n.id)} onCheckedChange={(checked) => setSelected(prev => checked ? [...prev, n.id] : prev.filter(id => id !== n.id))} />
                                    </td>
                                    <td className="px-3 py-4">
                                        <span className={`inline-block w-3 h-3 rounded-full ${n.is_read ? 'bg-slate-500' : 'bg-blue-400 animate-pulse'}`} title={n.is_read ? t('admin.notifications.read') : t('admin.notifications.unread')}></span>
                                    </td>
                                    <td className="px-3 py-4">
                                        <div className="flex items-center gap-3">
                                            <MessageSquare className={`w-5 h-5 shrink-0 ${n.is_read ? 'text-slate-500' : 'text-teal-400'}`} />
                                            <div>
                                                <p className={`font-medium ${n.is_read ? 'text-slate-400' : 'text-white'}`}>{getNotificationLabel(n)}</p>
                                                <p className="text-xs text-slate-500">{t('admin.notifications.customer', { name: n.customer_name || t('common.unknown') })}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-3 py-4 text-sm text-slate-300">{n.branch_name || t('admin.notifications.general')}</td>
                                    <td className="px-3 py-4 text-sm text-slate-400">{formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: i18n.language.startsWith('tr') ? tr : enUS })}</td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {totalCount > 0 && (
                <div className="bg-slate-800/40 rounded-lg p-4 border border-slate-700/50 mt-4 flex flex-col md:flex-row items-center justify-between gap-4">
                    <p className="text-slate-400 text-sm">{t('admin.notifications.totalNotifications', { count: totalCount })}</p>
                    <div className="flex items-center gap-2">
                        <Button onClick={() => setPage(p => p - 1)} disabled={page === 1} size="sm" variant="outline" className="border-slate-700"><ChevronLeft className="w-4 h-4 mr-1"/>{t('admin.notifications.previous')}</Button>
                        <span className="text-sm text-white font-medium px-2">{t('admin.notifications.pageOf', { current: page, total: totalPages })}</span>
                        <Button onClick={() => setPage(p => p + 1)} disabled={page >= totalPages} size="sm" variant="outline" className="border-slate-700">{t('admin.notifications.next')}<ChevronRight className="w-4 h-4 ml-1"/></Button>
                    </div>
                </div>
            )}
             <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}><DialogContent className="bg-slate-900 border-slate-800 text-white"><DialogHeader><DialogTitle>{t('admin.notifications.deleteTitle')}</DialogTitle><DialogDescription>{t('admin.notifications.deleteConfirm', { count: selected.length })}</DialogDescription></DialogHeader><DialogFooter className="mt-4"><Button variant="outline" onClick={() => setIsDeleteModalOpen(false)}>{t('common.cancel')}</Button><Button variant="destructive" onClick={handleBulkDelete}>{t('common.delete')}</Button></DialogFooter></DialogContent></Dialog>
        
             {/* Detail Modal */}
             {selectedFeedback && (
                 <FeedbackDetailModal 
                     isOpen={!!selectedFeedback}
                     onClose={() => setSelectedFeedback(null)}
                     feedback={selectedFeedback}
                     // Optional: If you want status updates here to reflect somewhere, handle it
                 />
             )}
        </div>
    );
};

export default NotificationHistory;
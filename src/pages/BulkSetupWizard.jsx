import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import { Download, Loader2, Sparkles, CheckCircle2 } from 'lucide-react';

export default function BulkSetupWizard() {
    const [businesses, setBusinesses] = useState([]);
    const [selectedBusiness, setSelectedBusiness] = useState('');
    const [branchData, setBranchData] = useState('');
    const [results, setResults] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [loadingBusinesses, setLoadingBusinesses] = useState(true);
    const { toast } = useToast();

    // Load businesses on mount
    React.useEffect(() => {
        loadBusinesses();
    }, []);

    const loadBusinesses = async () => {
        try {
            const { data, error } = await supabase
                .from('businesses')
                .select('id, business_name')
                .order('business_name');

            if (error) throw error;
            setBusinesses(data || []);
        } catch (error) {
            console.error('Error loading businesses:', error);
            toast({
                title: 'Hata',
                description: 'İşletmeler yüklenemedi.',
                variant: 'destructive'
            });
        } finally {
            setLoadingBusinesses(false);
        }
    };

    const handleBulkCreate = async () => {
        if (!selectedBusiness) {
            toast({
                title: 'Uyarı',
                description: 'Lütfen bir işletme seçin.',
                variant: 'destructive'
            });
            return;
        }

        if (!branchData.trim()) {
            toast({
                title: 'Uyarı',
                description: 'Lütfen şube verilerini girin.',
                variant: 'destructive'
            });
            return;
        }

        setIsLoading(true);
        try {
            const { data, error } = await supabase.rpc('bulk_create_branches', {
                p_business_id: selectedBusiness,
                p_branch_data: branchData
            });

            if (error) throw error;

            setResults(data);
            toast({
                title: 'Başarılı!',
                description: `${data.length} şube başarıyla oluşturuldu.`,
                className: 'bg-green-600 text-white border-none'
            });
        } catch (error) {
            console.error('Bulk create error:', error);
            toast({
                title: 'Hata',
                description: error.message || 'Şubeler oluşturulurken bir hata oluştu.',
                variant: 'destructive'
            });
        } finally {
            setIsLoading(false);
        }
    };

    const exportToCSV = () => {
        if (!results || results.length === 0) return;

        // CSV headers
        const headers = ['Şube Adı', 'QR Kodu', 'Feedback URL', 'Manager Kodu', 'Owner Kodları', 'Google URL'];

        // CSV rows
        const rows = results.map(r => [
            r.branch_name,
            r.qr_code,
            r.feedback_url,
            r.manager_code,
            r.owner_codes.join(', '),
            r.google_url || ''
        ]);

        // Combine headers and rows
        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
        ].join('\n');

        // Create blob and download
        const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);

        link.setAttribute('href', url);
        link.setAttribute('download', `vocalize_setup_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        toast({
            title: 'İndirildi',
            description: 'CSV dosyası başarıyla indirildi.',
            className: 'bg-green-600 text-white border-none'
        });
    };

    return (
        <div className="container mx-auto p-6 max-w-7xl">
            <Card className="bg-slate-900 border-slate-700">
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <Sparkles className="h-6 w-6 text-orange-500" />
                        <CardTitle className="text-2xl text-white">Enterprise Magic Setup</CardTitle>
                    </div>
                    <CardDescription className="text-slate-400">
                        300+ şubeli zinciri 5 dakikada kurun. Excel'den kopyala, yapıştır, başlat!
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">

                    {/* Step 1: Select Business */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-300">
                            1. İşletme Seçin
                        </label>
                        <Select value={selectedBusiness} onValueChange={setSelectedBusiness} disabled={loadingBusinesses}>
                            <SelectTrigger className="bg-slate-800 border-slate-600 text-white">
                                <SelectValue placeholder={loadingBusinesses ? "Yükleniyor..." : "İşletme seçin..."} />
                            </SelectTrigger>
                            <SelectContent className="bg-slate-800 border-slate-600">
                                {businesses.map(business => (
                                    <SelectItem key={business.id} value={business.id} className="text-white">
                                        {business.business_name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Step 2: Paste Branch Data */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-300">
                            2. Şube Verilerini Yapıştırın
                        </label>
                        <p className="text-xs text-slate-400">
                            Format: <code className="bg-slate-800 px-2 py-1 rounded">Şube Adı | Google Review URL</code> (Her satırda bir şube)
                        </p>
                        <Textarea
                            value={branchData}
                            onChange={(e) => setBranchData(e.target.value)}
                            placeholder="Alsancak Şubesi | https://g.page/r/...&#10;Karşıyaka Şubesi | https://g.page/r/...&#10;Bornova Şubesi | https://g.page/r/..."
                            className="bg-slate-800 border-slate-600 text-white min-h-[200px] font-mono text-sm"
                        />
                    </div>

                    {/* Step 3: Start Setup */}
                    <Button
                        onClick={handleBulkCreate}
                        disabled={isLoading || !selectedBusiness || !branchData.trim()}
                        className="w-full bg-orange-600 hover:bg-orange-700 text-white"
                        size="lg"
                    >
                        {isLoading ? (
                            <>
                                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                Oluşturuluyor...
                            </>
                        ) : (
                            <>
                                <Sparkles className="mr-2 h-5 w-5" />
                                Kurulumu Başlat
                            </>
                        )}
                    </Button>

                    {/* Results Table */}
                    {results && results.length > 0 && (
                        <div className="space-y-4 mt-8">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                                    <h3 className="text-lg font-semibold text-white">
                                        {results.length} Şube Başarıyla Oluşturuldu
                                    </h3>
                                </div>
                                <Button
                                    onClick={exportToCSV}
                                    variant="outline"
                                    className="border-slate-600 text-white hover:bg-slate-800"
                                >
                                    <Download className="mr-2 h-4 w-4" />
                                    CSV İndir
                                </Button>
                            </div>

                            <div className="border border-slate-700 rounded-lg overflow-hidden">
                                <Table>
                                    <TableHeader className="bg-slate-800">
                                        <TableRow className="border-slate-700">
                                            <TableHead className="text-slate-300">Şube Adı</TableHead>
                                            <TableHead className="text-slate-300">QR Kodu</TableHead>
                                            <TableHead className="text-slate-300">Feedback URL</TableHead>
                                            <TableHead className="text-slate-300">Manager Kodu</TableHead>
                                            <TableHead className="text-slate-300">Owner Kodları</TableHead>
                                            <TableHead className="text-slate-300">Google URL</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {results.map((result, index) => (
                                            <TableRow key={index} className="border-slate-700">
                                                <TableCell className="text-white font-medium">{result.branch_name}</TableCell>
                                                <TableCell className="text-slate-300 font-mono text-xs">{result.qr_code}</TableCell>
                                                <TableCell className="text-blue-400 text-xs">
                                                    <a href={result.feedback_url} target="_blank" rel="noopener noreferrer" className="hover:underline">
                                                        {result.feedback_url}
                                                    </a>
                                                </TableCell>
                                                <TableCell className="text-green-400 font-mono text-xs">{result.manager_code}</TableCell>
                                                <TableCell className="text-orange-400 font-mono text-xs">
                                                    {result.owner_codes.slice(0, 2).join(', ')}
                                                    {result.owner_codes.length > 2 && '...'}
                                                </TableCell>
                                                <TableCell className="text-slate-400 text-xs truncate max-w-[200px]">
                                                    {result.google_url || '-'}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>

                            <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
                                <h4 className="text-sm font-semibold text-white mb-2">Owner Kodları (Tüm İşletme Erişimi)</h4>
                                <div className="flex flex-wrap gap-2">
                                    {results[0]?.owner_codes.map((code, idx) => (
                                        <code key={idx} className="bg-orange-600/20 text-orange-400 px-3 py-1 rounded text-sm font-mono">
                                            {code}
                                        </code>
                                    ))}
                                </div>
                                <p className="text-xs text-slate-400 mt-2">
                                    Bu kodlar tüm şubelere erişim sağlar. İşletme yöneticilerine verin.
                                </p>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

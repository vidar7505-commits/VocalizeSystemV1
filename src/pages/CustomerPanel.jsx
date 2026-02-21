import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { cn, formatCustomerName, getCustomerData, calculateDelta, formatCompactNumber, fetchDeep } from "@/lib/utils";
import AuthModal from '@/components/AuthModal';
import AgeSelectionModal from '@/components/AgeSelectionModal';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Settings, MessageSquare, MapPin, Mail, Phone, Lock, LogOut, Trash2, X, Star, ChevronDown,
  AlertTriangle, Lightbulb, Home, List, TrendingUp, Menu, QrCode, Info, AlertCircle, Filter,
  MessageCircle, Loader2, Image as ImageIcon, Upload, PieChart, BarChart, Activity, UserPlus, LogIn,
  Building2, CheckCircle2, ChevronRight, Edit2, Maximize2, KeyRound, Shield, HelpCircle, ArrowRight,
  Send, AlertOctagon, FileText, Pin, Search, ChevronLeft
} from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription
} from "@/components/ui/dialog";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import ComponentErrorBoundary from '@/components/ComponentErrorBoundary';
import { texts } from './customer/customerTranslations';
import {
  isOlderThan48Hours, getStatusBadge, formatDate,
  extractCoordsFromMapsUrl, calculateDistance, getBranchCoords
} from './customer/customerUtils';
import SettingsModal from './customer/SettingsModal';
import SupportModal from './customer/SupportModal';
import DeleteAccountModal from './customer/DeleteAccountModal';





export default function CustomerPanel() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const { toast } = useToast();
  const { user: authUser, loading: authLoading, signOut } = useAuth();

  const businessParam = searchParams.get('business');
  const branchParam = searchParams.get('branch');
  const qrParam = searchParams.get('qr');
  const fromQrParam = searchParams.get('from_qr');
  const guestParam = searchParams.get('guest');

  const [isLoading, setIsLoading] = useState(true);
  const [isGuest, setIsGuest] = useState(false);
  const [user, setUser] = useState(null);
  const [language, setLanguage] = useState(() => localStorage.getItem('vocalize_lang') || 'tr');

  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [authDefaultTab, setAuthDefaultTab] = useState('login');
  const [showAdvancedFilter, setShowAdvancedFilter] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showBranchSelector, setShowBranchSelector] = useState(false);
  const [showGuestWarningModal, setShowGuestWarningModal] = useState(false);
  const [pendingFeedbackType, setPendingFeedbackType] = useState(null);
  const [dontShowGuestWarning, setDontShowGuestWarning] = useState(false);
  const [supportModalOpen, setSupportModalOpen] = useState(false);
  const [showAgeModal, setShowAgeModal] = useState(false);

  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);

  const [selectedFeedback, setSelectedFeedback] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);


  const [suggestedBusinessName, setSuggestedBusinessName] = useState('');
  const [suggestedBusinessLocation, setSuggestedBusinessLocation] = useState('');
  const [suggestingBusiness, setSuggestingBusiness] = useState(false);

  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [deleteAccountConfirmed, setDeleteAccountConfirmed] = useState(false);

  const [selectedBusiness, setSelectedBusiness] = useState(() => businessParam || '');
  const [selectedBranch, setSelectedBranch] = useState(() => branchParam || '');

  const [businesses, setBusinesses] = useState([]);
  const [branches, setBranches] = useState([]);
  const [hasScannedQR, setHasScannedQR] = useState(false);
  const [qrInfo, setQrInfo] = useState(null);
  const [userProfile, setUserProfile] = useState({});
  const [selectedBusinessForBranches, setSelectedBusinessForBranches] = useState(null);
  // 🟢 Branch Selector Logic
  const [branchSearchTerm, setBranchSearchTerm] = useState('');
  const [branchPage, setBranchPage] = useState(1);
  const branchesPerPage = 5;
  const [recentBranches, setRecentBranches] = useState([]); // Array of {id, is_pinned, last_interaction_at}
  const [userLocation, setUserLocation] = useState(null);
  const [isLocating, setIsLocating] = useState(false);
  const [isBranchesLoading, setIsBranchesLoading] = useState(false);

  // 🟢 Filter Popover Control
  const [filterOpen, setFilterOpen] = useState(false);
  const [showTitleInfo, setShowTitleInfo] = useState(false);

  const [stats, setStats] = useState({
    total: 0, avgRating: 0, topBranch: '', topBranchCount: 0,
    complaints: 0, suggestions: 0, reviews: 0,
    worstBranch: '', worstBranchCount: 0, userTitle: ''
  });

  const [feedbackList, setFeedbackList] = useState([]);
  const [currentView, setCurrentView] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [filterBranch, setFilterBranch] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [sortOrder, setSortOrder] = useState('newest');

  const fromQR = hasScannedQR || !!qrParam;
  const businessName = businesses.find(b => b.id === selectedBusiness)?.business_name;
  const branchName = branches.find(b => b.id === selectedBranch)?.branch_name_tr || qrInfo?.branch_name;

  const lastLoggedRef = useRef({ business: null, branch: null });

  // 🟢 ANALYTICS (GÜNCELLENDİ: QR ve WEB AYRILDI + iOS localStorage backup)
  useEffect(() => {
    if (!businessParam) return;

    const sessionKey = `logged_${businessParam}_${branchParam || 'x'}`;
    const alreadyLogged = sessionStorage.getItem(sessionKey);

    const urlParams = new URLSearchParams(window.location.search);
    const isFromQr = urlParams.get('from_qr') === 'true' || urlParams.get('qr');

    // Load recent branches from localStorage
    try {
      const stored = localStorage.getItem('vocalize_recent_branches');
      if (stored) {
        setRecentBranches(JSON.parse(stored));
      }
    } catch (e) { console.error("Recent branches load error", e); }

    // 🟢 DURUM 1: QR İLE GELDİ
    if (isFromQr && !alreadyLogged) {
      supabase.from('qr_scans').insert({
        business_id: businessParam,
        branch_id: branchParam || null,
        qr_code: urlParams.get('qr') || 'unknown',
        user_agent: navigator.userAgent,
        created_at: new Date().toISOString()
      }).then(({ error }) => {
        if (!error) {
          sessionStorage.setItem(sessionKey, 'true');

          // 🟢 YENİ: localStorage'a backup yaz (parametreleri silmeden ÖNCESİ)
          // iOS'ta parametreler silinse bile fallback için storage'a veri yaz
          try {
            localStorage.setItem('vocalize_last_business', businessParam);
            if (branchParam) {
              localStorage.setItem('vocalize_last_branch', branchParam);
            }
          } catch (e) {
            console.warn('Storage backup failed:', e);
          }

          const newUrl = new URL(window.location.href);
          newUrl.searchParams.delete('from_qr');
          newUrl.searchParams.delete('qr');
          newUrl.searchParams.delete('guest');
          useEffect(() => {
            setBranchPage(1);
          }, [branchSearchTerm, selectedBusinessForBranches]);
          window.history.replaceState(null, '', newUrl.toString());
        }
      });
    }
    // 🟢 DURUM 2: NORMAL WEB GİRİŞİ (QR parametresi YOK)
    else if (!alreadyLogged && !isFromQr) {
      supabase.from('page_views').insert({
        business_id: businessParam,
        branch_id: branchParam || null,
        source: 'web',
        user_agent: navigator.userAgent,
        created_at: new Date().toISOString()
      }).then(({ error }) => {
        if (!error) {
          sessionStorage.setItem(sessionKey, 'true');
        }
      });
    }
  }, [businessParam, branchParam, qrParam, location.pathname]);


  const t = useMemo(() => texts[language] || texts.tr, [language]);

  useEffect(() => {
    localStorage.setItem('vocalize_lang', language);
  }, [language]);

  // --- INITIALIZATION ---
  useEffect(() => {
    const init = async () => {
      if (authLoading) return;
      setIsLoading(true);
      try {
        const guestMode = localStorage.getItem('vocalize_guest_mode');
        let isGuestUser = guestParam === 'true' || guestMode === 'true';

        if (authUser) {
          isGuestUser = false;
          if (guestMode) localStorage.removeItem('vocalize_guest_mode');
        }

        setIsGuest(isGuestUser);

        if (authUser && !isGuestUser) {
          setUser(authUser);

          const { data: profile } = await supabase
            .from('customer_profiles')
            .select('*')
            .eq('user_id', authUser.id)
            .maybeSingle();

          const metaName = authUser.user_metadata?.full_name ||
            (authUser.user_metadata?.first_name ? `${authUser.user_metadata.first_name} ${authUser.user_metadata.last_name}` : '');

          setUserProfile({
            name: profile?.name || metaName || 'Kullanıcı',
            email: authUser.email,
            phone: profile?.phone || authUser.user_metadata?.phone,
            age_group: profile?.age_group // 🟢 Add age_group to state
          });
        } else if (isGuestUser) {
          setUser(null);
        }

        if (authUser) {
          // Auth user profile check is done below after profile fetch
          // We need to wait for profile to be set, so we'll do this in a separate useEffect depending on userProfile
        }

        // 🟢 URL parametreleri PRIMARY, localStorage FALLBACK
        let targetBusinessId = businessParam;
        let targetBranchId = branchParam;

        if (!targetBusinessId) {
          targetBusinessId = localStorage.getItem('vocalize_last_business');
        }

        if (!targetBranchId && targetBusinessId) {
          targetBranchId = localStorage.getItem('vocalize_last_branch');
        }

        if (qrParam) {
          setHasScannedQR(true);
          if (targetBranchId) {
            const { data: branchData } = await supabase.from('branches').select('branch_name_tr').eq('id', targetBranchId).single();
            if (branchData) {
              setQrInfo({ business_id: targetBusinessId, branch_id: targetBranchId, qr_code: qrParam, branch_name: branchData.branch_name_tr });
            }
          }
        }

        if (targetBusinessId) {
          setSelectedBusiness(targetBusinessId);
          await fetchBranches(targetBusinessId);

          if (targetBranchId) {
            setSelectedBranch(targetBranchId);
          }

          // Optimization: Only navigate if URL needs correction
          const needsCorrection = targetBusinessId !== businessParam ||
            targetBranchId !== branchParam ||
            (isGuestUser && guestParam !== 'true');

          if (needsCorrection) {
            const newParams = new URLSearchParams(searchParams);
            newParams.set('business', targetBusinessId);
            if (targetBranchId) newParams.set('branch', targetBranchId);
            if (isGuestUser) newParams.set('guest', 'true');
            if (language) newParams.set('lang', language);

            navigate(`${location.pathname}?${newParams.toString()}`, { replace: true });
          }
        }

        await fetchBusinesses();
      } catch (error) {
        console.error('Initialization error:', error);
      } finally {
        setIsLoading(false);
      }
    };

    init();
  }, [authUser, authLoading, location.search]); // 🟢 location.search added to handle guest login/param changes

  // 🟢 AUTOMATIC AGE MODAL TRIGGER
  // Decoupled from init to ensure it only runs after loading is complete and state is settled
  useEffect(() => {
    if (isLoading || authLoading || showAgeModal) return;

    if (isGuest) {
      const storedAge = localStorage.getItem('vocalize_customer_age_group');
      if (!storedAge) {
        setShowAgeModal(true);
      }
    } else if (user) {
      // For registered users, we check the profile data we just fetched
      if (!userProfile?.age_group) {
        setShowAgeModal(true);
      }
    }
  }, [isLoading, authLoading, isGuest, user, userProfile, showAgeModal]);

  const fetchBusinesses = useCallback(async () => {
    try {
      let allBusinessIds = [];
      const visitedBusinessesJson = localStorage.getItem('vocalize_visited_businesses');
      const localIds = visitedBusinessesJson ? JSON.parse(visitedBusinessesJson) : [];
      allBusinessIds = [...localIds];

      if (authUser?.email && !isGuest) {
        const { data: dbBusinesses, error } = await supabase
          .from('customer_visited_businesses')
          .select('business_id')
          .eq('customer_email', authUser.email);

        if (!error && dbBusinesses) {
          const dbIds = dbBusinesses.map(b => b.business_id);
          allBusinessIds = [...new Set([...allBusinessIds, ...dbIds])];
          localStorage.setItem('vocalize_visited_businesses', JSON.stringify(allBusinessIds));
        }
      }

      if (allBusinessIds.length === 0) {
        setBusinesses([]);
        return;
      }

      const { data, error } = await supabase
        .from('businesses')
        .select('id, business_name')
        .in('id', allBusinessIds);

      if (error) throw error;
      setBusinesses(data || []);
    } catch (error) {
      console.error('Error fetching businesses:', error);
      setBusinesses([]);
    }
  }, [authUser, isGuest]);

  const fetchBranches = useCallback(async (businessId) => {
    if (!businessId) return;
    try {
      const query = supabase
        .from('branches')
        .select('*')
        .eq('business_id', businessId)
        .eq('is_active', true);

      const allBranchesList = await fetchDeep(query);
      setBranches(allBranchesList);
    } catch (error) {
      console.error('Error fetching branches:', error);
    }
  }, []);

  const persistVisitedBusiness = useCallback(async (businessId) => {
    try {
      const existingJson = localStorage.getItem('vocalize_visited_businesses');
      const existingIds = existingJson ? JSON.parse(existingJson) : [];

      if (!existingIds.includes(businessId)) {
        existingIds.push(businessId);
        localStorage.setItem('vocalize_visited_businesses', JSON.stringify(existingIds));
      }

      // 🟢 DÜZELTME: Doğrudan authUser'ı kullan (Race condition'ı önler)
      const targetEmail = authUser?.email || user?.email;

      if (targetEmail) {
        await supabase.from('customer_visited_businesses').upsert({
          customer_email: targetEmail,
          business_id: businessId,
          last_visit_at: new Date().toISOString()
        }, {
          onConflict: 'customer_email,business_id'
        });
      }
    } catch (err) {
      console.error('Error persisting visited business:', err);
    }
  }, [user, authUser]); // authUser eklendi

  const persistQrScan = useCallback(async (businessId, branchId, qrCode) => {
    if (!businessId || !branchId || !qrCode) {
      console.warn('[persistQrScan] Eksik parametre:', { businessId, branchId, qrCode });
      return;
    }

    try {
      // 1. Visited business'ı kaydet
      await persistVisitedBusiness(businessId);

      // 2. 🟢 YENİ: localStorage'a yaz (arka planda, bloke etme!)
      // Promise.allSettled kullan - hata olsa bile devam et
      Promise.allSettled([
        (async () => {
          try {
            const qrData = {
              business_id: businessId,
              branch_id: branchId,
              qr_code: qrCode,
              scanned_at: new Date().toISOString()
            };
            localStorage.setItem(`vocalize_qr_${businessId}`, JSON.stringify(qrData));
          } catch (e) {
            console.warn('[persistQrScan] localStorage error:', e);
          }
        })()
      ]);

      // 3. Supabase'e yaz (kritik)
      const targetEmail = authUser?.email || user?.email;

      if (targetEmail) {
        await supabase.from('customer_qr_scans').upsert({
          customer_email: targetEmail,
          business_id: businessId,
          branch_id: branchId,
          qr_code: qrCode,
          last_scan_at: new Date().toISOString()
        }, {
          onConflict: 'customer_email,business_id,branch_id,qr_code'
        });
      }
    } catch (err) {
      console.error('Error persisting QR scan:', err);
      // Hata olsa bile devam et - critical değil
    }
  }, [user, authUser, persistVisitedBusiness]);

  const loadPersistedBusinesses = useCallback(async () => {
    if (!user?.email) return;
    try {
      const { data, error } = await supabase
        .from('customer_visited_businesses')
        .select('business_id')
        .eq('customer_email', user.email)
        .order('last_visit_at', { ascending: false });

      if (!error && data && data.length > 0) {
        const businessIds = data.map(item => item.business_id);
        localStorage.setItem('vocalize_visited_businesses', JSON.stringify(businessIds));
      }
    } catch (err) {
      console.error('Error loading persisted businesses:', err);
    }
  }, [user]);

  const loadPersistedQrs = useCallback(async () => {
    // 🟢 GUEST MODE: Load pins from localStorage
    if (isGuest) {
      try {
        const storedPins = localStorage.getItem('vocalize_guest_pinned_branches');
        if (storedPins) {
          const pinnedBranchIds = JSON.parse(storedPins);
          // Convert to same format as DB records for UI consistency
          const guestRecentBranches = pinnedBranchIds.map(id => ({
            id: id,
            is_pinned: true,
            last_interaction_at: new Date().toISOString() // Mock date for sorting
          }));
          setRecentBranches(guestRecentBranches);
        } else {
          setRecentBranches([]);
        }
      } catch (e) {
        console.error("Guest pins load error:", e);
      }
      return;
    }

    if (!user?.email) return;
    try {
      const { data, error } = await supabase
        .from('customer_qr_scans')
        .select(`
          business_id, 
          branch_id, 
          qr_code, 
          last_scan_at,
          is_pinned,
          last_interaction_at,
          businesses(business_name), 
          branches(branch_name_tr)
        `)
        .eq('customer_email', user.email)
        .order('is_pinned', { ascending: false })
        .order('last_interaction_at', { ascending: false });

      if (!error && data && data.length > 0) {
        // Load branch interactions for sorting UI
        const branchInteractions = data.map(qr => ({
          id: qr.branch_id,
          is_pinned: qr.is_pinned || false,
          last_interaction_at: qr.last_interaction_at || qr.last_scan_at
        }));
        setRecentBranches(branchInteractions);

        // Also persist to localStorage (backward compatibility)
        data.forEach(qr => {
          const qrData = {
            business_id: qr.business_id,
            branch_id: qr.branch_id,
            qr_code: qr.qr_code,
            business_name: qr.businesses?.business_name,
            branch_name: qr.branches?.branch_name_tr,
            scanned_at: qr.last_scan_at
          };
          localStorage.setItem(`vocalize_qr_${qr.business_id}`, JSON.stringify(qrData));
        });
      }
    } catch (err) {
      console.error('Error loading persisted QRs:', err);
    }
  }, [user, isGuest]);

  useEffect(() => {
    if (user && !isGuest) {
      const loadData = async () => {
        await loadPersistedBusinesses();
        await loadPersistedQrs();
        fetchBusinesses();
      };
      loadData();
    }
  }, [user, isGuest, loadPersistedBusinesses, loadPersistedQrs, fetchBusinesses]);

  // 🟢 DÜZELTME: authLoading kontrolü eklendi. Kullanıcı verisi tam yüklenmeden çalışmayacak.
  useEffect(() => {
    if (authLoading) return; // BEKLE!
    if (qrParam && businessParam && branchParam) {
      persistQrScan(businessParam, branchParam, qrParam);
    }
  }, [qrParam, businessParam, branchParam, persistQrScan, authLoading]);



  const handleAgeSelect = async (ageGroup) => {
    try {
      if (isGuest) {
        localStorage.setItem('vocalize_customer_age_group', ageGroup);
        setShowAgeModal(false);
        toast({
          title: "Teşekkürler",
          description: "Seçiminiz kaydedildi.",
          className: "bg-teal-600 text-white border-none"
        });
      } else if (user) {
        // 🟢 FIX: Use UPSERT instead of UPDATE to create profile if it doesn't exist
        const { error } = await supabase
          .from('customer_profiles')
          .upsert({
            user_id: user.id,
            email: user.email,
            age_group: ageGroup,
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'user_id',
            ignoreDuplicates: false
          });

        if (error) throw error;

        // 🟢 RETROACTIVE UPDATE (Background)
        // Update all past feedbacks of this user that have no age group
        if (user.email) {
          supabase.from('feedbacks')
            .update({ customer_age_group: ageGroup })
            .eq('customer_email', user.email)
            .is('customer_age_group', null)
            .then(({ error }) => {
              if (error) console.error("Retroactive update failed:", error);
              else console.log("Retroactive update success");
            });
        }

        setShowAgeModal(false);
        toast({
          title: "Teşekkürler",
          description: "Profiliniz güncellendi.",
          className: "bg-teal-600 text-white border-none"
        });

        // Update local state if we add age_group to it
        setUserProfile(prev => ({ ...prev, age_group: ageGroup }));
      }

      // Resume pending action if any
      if (pendingFeedbackType) {
        // Use timeout to allow state updates/modal close to settle
        setTimeout(() => {
          proceedToFeedback(pendingFeedbackType);
          setPendingFeedbackType(null);
        }, 500);
      }
    } catch (error) {
      console.error('Age update error:', error);
      toast({
        title: "Hata",
        description: "Bir hata oluştu.",
        variant: "destructive"
      });
    }
  };

  useEffect(() => {
    if (isLoading && (businessParam || branchParam)) return;

    if (businessParam) {
      if (businessParam !== selectedBusiness) {
        setSelectedBusiness(businessParam);
      }
    } else {
      if (selectedBusiness) setSelectedBusiness('');
    }

    if (branchParam) {
      if (branchParam !== selectedBranch) {
        setSelectedBranch(branchParam);
      }
    } else {
      const savedBranch = localStorage.getItem('vocalize_last_branch');
      const savedBusiness = localStorage.getItem('vocalize_last_business');

      if (savedBranch && savedBusiness === selectedBusiness && selectedBusiness) {
        setSelectedBranch(savedBranch);
        const newParams = new URLSearchParams(searchParams);
        newParams.set('branch', savedBranch);
        navigate(`${location.pathname}?${newParams.toString()}`, { replace: true });
      } else {
        if (selectedBranch) setSelectedBranch('');
      }
    }

    if (businessParam && !businessName) {
      supabase
        .from('businesses')
        .select('business_name')
        .eq('id', businessParam)
        .single()
        .then(({ data }) => {
          if (data) {
            setBusinesses(prev => {
              const exists = prev.find(b => b.id === businessParam);
              if (!exists) {
                return [...prev, { id: businessParam, business_name: data.business_name }];
              }
              return prev;
            });
          }
        });
    }
  }, [businessParam, branchParam, selectedBusiness, selectedBranch, businessName, isLoading]);

  useEffect(() => {
    if (isLoading) return;

    if (selectedBusiness) {
      const params = new URLSearchParams(searchParams);

      if (params.get('business') !== selectedBusiness) {
        params.set('business', selectedBusiness);
      }

      if (selectedBranch) {
        if (params.get('branch') !== selectedBranch) {
          params.set('branch', selectedBranch);
        }
      }

      params.set('lang', language);
      if (isGuest) params.set('guest', 'true');

      const newUrl = `${location.pathname}?${params.toString()}`;
      if (window.location.search !== `?${params.toString()}`) {
        window.history.replaceState(null, '', newUrl);
      }
    }
  }, [selectedBusiness, selectedBranch, language, isGuest, searchParams, location.pathname, isLoading]);

  const fetchStats = useCallback(async () => {
    const activeUser = authUser || user;
    if (!activeUser?.email) return;

    try {
      const { data: feedbacks, error: feedbacksError } = await supabase
        .from('feedbacks')
        .select('rating, feedback_type, branch_id, created_at, branches(branch_name_tr)')
        .eq('customer_email', activeUser.email);

      if (feedbacksError) throw feedbacksError;

      if (!feedbacks || feedbacks.length === 0) {
        setStats({
          total: 0, avgRating: 0, topBranch: '', topBranchCount: 0,
          complaints: 0, suggestions: 0, reviews: 0,
          worstBranch: '', worstBranchCount: 0, userTitle: ''
        });
        return;
      }

      const total = feedbacks.length;
      const ratingsOnly = feedbacks.filter(f => f.rating);
      const avgRating = ratingsOnly.length > 0 ? ratingsOnly.reduce((sum, f) => sum + f.rating, 0) / ratingsOnly.length : 0;

      const branchCounts = {};
      feedbacks.forEach(f => {
        const branchName = f.branches?.branch_name_tr || t.unknown;
        branchCounts[branchName] = (branchCounts[branchName] || 0) + 1;
      });
      const topBranch = Object.keys(branchCounts).sort((a, b) => branchCounts[b] - branchCounts[a])[0] || '';
      const topBranchCount = branchCounts[topBranch] || 0;

      const complaints = feedbacks.filter(f => f.feedback_type === 'complaint').length;
      const suggestions = feedbacks.filter(f => f.feedback_type === 'suggestion').length;
      const reviews = feedbacks.filter(f => f.feedback_type === 'review').length;

      const complaintsByBranch = {};
      feedbacks
        .filter(f => f.feedback_type === 'complaint')
        .forEach(f => {
          const branchName = f.branches?.branch_name_tr || t.unknown;
          complaintsByBranch[branchName] = (complaintsByBranch[branchName] || 0) + 1;
        });
      const worstBranch = Object.keys(complaintsByBranch).sort((a, b) => complaintsByBranch[b] - complaintsByBranch[a])[0] || '';
      const worstBranchCount = complaintsByBranch[worstBranch] || 0;

      let userTitle = t.userTitle.newVoice;
      if (total >= 6 && total < 20) {
        userTitle = t.userTitle.experiencedObserver;
      } else if (total >= 20) {
        userTitle = t.userTitle.vocalizAmbassador;
      }

      setStats({
        total, avgRating, topBranch, topBranchCount,
        complaints, suggestions, reviews,
        worstBranch, worstBranchCount, userTitle
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  }, [user, authUser, t]);

  const fetchFeedbacks = useCallback(async () => {
    const activeUser = authUser || user;
    if (!activeUser?.email) return;

    try {
      const { data, error } = await supabase
        .from('feedbacks')
        .select('id, customer_email, message, rating, general_eval_rating, general_eval_comment, feedback_type, status, created_at, feedback_images, branch_id, branches(branch_name_tr)')
        .eq('customer_email', activeUser.email)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setFeedbackList(data || []);
    } catch (error) {
      console.error('❌ Error fetching feedbacks:', error);
    }
  }, [user, authUser]);

  useEffect(() => {
    if (authUser || (!isGuest && user)) {
      if (currentView === 'stats') {
        fetchStats();
      }
      if (currentView === 'feedbacks') {
        fetchFeedbacks();
      }
    } else if (isGuest) {
      setFeedbackList([]);
      setStats({
        total: 0, avgRating: 0, topBranch: '', topBranchCount: 0,
        complaints: 0, suggestions: 0, reviews: 0,
        worstBranch: '', worstBranchCount: 0, userTitle: ''
      });
    }
  }, [isGuest, user, authUser, currentView, fetchStats, fetchFeedbacks]);

  // --- ACTIONS ---

  const handleBusinessCardClick = async (businessId) => {
    try {
      // 🟢 1. Open Modal Immediately
      setShowBranchSelector(true);
      setSelectedBusinessForBranches(businessId);
      setBranchPage(1);
      setBranchSearchTerm('');
      setIsBranchesLoading(true);

      // Async Operations
      await persistVisitedBusiness(businessId);
      await loadPersistedQrs(); // Will handle loading guest pins too

      const { data: branchesData, error } = await supabase
        .from('branches')
        .select('*')
        .eq('business_id', businessId)
        .eq('is_active', true);

      if (error) throw error;

      if (!branchesData || branchesData.length === 0) {
        toast({
          title: language === 'tr' ? 'Uyarı' : 'Warning',
          description: language === 'tr' ? 'Bu işletme için şube bulunamadı' : 'No branches found for this business',
          variant: "destructive"
        });
        // Don't close modal immediately to avoid jarring UX, maybe show empty state
      } else {
        setBranches(branchesData);
      }
    } catch (err) {
      console.error('Error loading branches:', err);
      toast({
        title: language === 'tr' ? 'Hata' : 'Error',
        description: language === 'tr' ? 'Şubeler yüklenirken hata oluştu' : 'Error loading branches',
        variant: "destructive"
      });
    } finally {
      setIsBranchesLoading(false);
    }
  };

  const handleBranchSelectForFeedback = async (branchId) => {
    try {
      // 1. Close modal immediately
      setShowBranchSelector(false);

      // 2. Persist to localStorage for fallback
      localStorage.setItem('vocalize_last_business', selectedBusinessForBranches);
      localStorage.setItem('vocalize_last_branch', branchId);

      // 3. Update URL parameters - this will trigger the main useEffect to update state
      // This avoids race conditions between manual state update and URL-triggered update
      const params = new URLSearchParams(searchParams);
      params.set('business', selectedBusinessForBranches);
      params.set('branch', branchId);
      params.set('lang', language);
      if (isGuest) params.set('guest', 'true');

      // Navigate with replace: false to allow back button
      navigate(`${location.pathname}?${params.toString()}`, { replace: false });

      // 4. Persist branch interaction (async)
      // For guests, we don't persist interaction to DB unless we want to track anonymous usage later
      if (!isGuest) {
        await persistBranchInteraction(selectedBusinessForBranches, branchId);
      }
    } catch (error) {
      console.error('Error in handleBranchSelectForFeedback:', error);
    }
  };

  // Persist branch interaction (manual selection or QR scan)
  const persistBranchInteraction = useCallback(async (businessId, branchId) => {
    const targetEmail = authUser?.email || user?.email;
    if (!targetEmail || isGuest) return;

    try {
      // Check if record exists for this user
      const { data: existing, error: checkError } = await supabase
        .from('customer_qr_scans')
        .select('id, is_pinned')
        .eq('customer_email', targetEmail)
        .eq('branch_id', branchId)
        .maybeSingle();

      if (checkError) {
        console.error('Error checking existing record:', checkError);
        return;
      }

      let result;
      if (existing) {
        // Update existing record
        result = await supabase
          .from('customer_qr_scans')
          .update({
            last_interaction_at: new Date().toISOString(),
            last_scan_at: new Date().toISOString()
          })
          .eq('id', existing.id);
      } else {
        // Insert new record
        result = await supabase
          .from('customer_qr_scans')
          .insert({
            customer_email: targetEmail,
            business_id: businessId,
            branch_id: branchId,
            qr_code: 'manual_selection',
            is_pinned: false,
            last_interaction_at: new Date().toISOString(),
            last_scan_at: new Date().toISOString()
          });
      }

      if (result.error) {
        console.error('Error persisting branch interaction:', result.error);
      } else {
        // Refresh recent branches for this user
        await loadPersistedQrs();
      }
    } catch (err) {
      console.error('Error persisting branch interaction:', err);
    }
  }, [authUser, user, isGuest, loadPersistedQrs, supabase]);

  // Toggle branch pin status
  const toggleBranchPin = useCallback(async (branchId) => {
    // 🟢 GUEST MODE: Pin to localStorage
    if (isGuest) {
      try {
        const storedPins = localStorage.getItem('vocalize_guest_pinned_branches');
        let pinnedBranchIds = storedPins ? JSON.parse(storedPins) : [];
        let newPinStatus = false;

        if (pinnedBranchIds.includes(branchId)) {
          // Unpin
          pinnedBranchIds = pinnedBranchIds.filter(id => id !== branchId);
          newPinStatus = false;
        } else {
          // Pin
          pinnedBranchIds.push(branchId);
          newPinStatus = true;
        }

        localStorage.setItem('vocalize_guest_pinned_branches', JSON.stringify(pinnedBranchIds));

        // Update UI immediately
        await loadPersistedQrs(); // Reloads from localStorage for guests

        toast({
          title: newPinStatus ? (language === 'tr' ? 'Sabitlendi' : 'Pinned') : (language === 'tr' ? 'Sabitlemeden Kaldırıldı' : 'Unpinned'),
          description: newPinStatus ? (language === 'tr' ? 'Şube sabitlendi' : 'Branch pinned') : (language === 'tr' ? 'Şube sabitlikten çıkarıldı' : 'Branch unpinned'),
          className: "bg-teal-600 text-white border-none"
        });
      } catch (e) {
        console.error("Guest pin toggle error:", e);
        toast({ title: "Hata", description: "Pin işlemi başarısız.", variant: "destructive" });
      }
      return;
    }

    // 🔴 REGISTERED USER MODE: Pin to Supabase
    const targetEmail = authUser?.email || user?.email;
    if (!targetEmail) return;

    try {
      // Find current branch record for this user
      const { data: existing, error: checkError } = await supabase
        .from('customer_qr_scans')
        .select('id, is_pinned')
        .eq('customer_email', targetEmail)
        .eq('branch_id', branchId)
        .maybeSingle();

      if (checkError) {
        console.error('Error checking pin status:', checkError);
        return;
      }

      // If record doesn't exist, we need to create it first (e.g. pinned from search without visiting)
      if (!existing) {
        // Create a placeholder record for the pin
        const { error: insertError } = await supabase
          .from('customer_qr_scans')
          .insert({
            customer_email: targetEmail,
            business_id: selectedBusinessForBranches, // Assuming context is available
            branch_id: branchId,
            qr_code: 'manual_pin',
            is_pinned: true,
            last_interaction_at: new Date().toISOString(),
            last_scan_at: new Date().toISOString()
          });

        if (insertError) throw insertError;

        await loadPersistedQrs();
        toast({
          title: language === 'tr' ? 'Sabitlendi' : 'Pinned',
          description: language === 'tr' ? 'Şube sabitlendi' : 'Branch pinned',
          className: "bg-teal-600 text-white border-none"
        });
        return;
      }

      const newPinStatus = !existing.is_pinned;

      const { error } = await supabase
        .from('customer_qr_scans')
        .update({ is_pinned: newPinStatus })
        .eq('id', existing.id);

      if (!error) {
        // Refresh user's branch list from DB
        await loadPersistedQrs();

        toast({
          title: newPinStatus ? (language === 'tr' ? 'Sabitlendi' : 'Pinned') : (language === 'tr' ? 'Sabitlemeden Kaldırıldı' : 'Unpinned'),
          description: newPinStatus ? (language === 'tr' ? 'Şube sabitlendi' : 'Branch pinned') : (language === 'tr' ? 'Şube sabitlikten çıkarıldı' : 'Branch unpinned'),
          className: "bg-teal-600 text-white border-none"
        });
      } else {
        console.error('Error updating pin:', error);
      }
    } catch (err) {
      console.error('Error toggling pin:', err);
    }
  }, [authUser, user, isGuest, language, toast, supabase, loadPersistedQrs, selectedBusinessForBranches]);

  // Helper: Geolocation
  const handleGeolocation = () => {
    if (userLocation) {
      setUserLocation(null);
      return;
    }

    setIsLocating(true);
    if (!navigator.geolocation) {
      toast({ title: "Hata", description: "Tarayıcınız konum servisini desteklemiyor.", variant: "destructive" });
      setIsLocating(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({ lat: position.coords.latitude, lng: position.coords.longitude });
        setIsLocating(false);
      },
      (err) => {
        console.error("Geolocation error:", err);
        setIsLocating(false);
      }
    );
  };



  // Reset page when search term or business changes
  useEffect(() => {
    setBranchPage(1);
  }, [branchSearchTerm, selectedBusinessForBranches]);

  const filteredBranchesForModal = useMemo(() => {
    let result = branches;

    // Filter by search term
    if (branchSearchTerm.trim()) {
      const query = branchSearchTerm.toLowerCase('tr');
      result = result.filter(b => b.branch_name_tr.toLowerCase('tr').includes(query));
    }

    // Sort ONLY by recent interactions (last_interaction_at), NOT by pin status
    // Pin status is used for DISPLAY SECTIONS, not for sorting
    result = [...result].sort((a, b) => {
      const aData = recentBranches.find(rb => rb.id === a.id);
      const bData = recentBranches.find(rb => rb.id === b.id);

      const aRecent = aData?.last_interaction_at;
      const bRecent = bData?.last_interaction_at;

      // 1. Recent interactions first (newest first)
      if (aRecent && !bRecent) return -1;
      if (!aRecent && bRecent) return 1;

      if (aRecent && bRecent) {
        return new Date(bRecent) - new Date(aRecent);
      }

      // 2. If neither has recent interaction, sort alphabetically
      return a.branch_name_tr.localeCompare(b.branch_name_tr, 'tr');
    });

    // Apply distance info if location is available
    if (userLocation) {
      result = result.map(branch => {
        const coords = getBranchCoords(branch);
        const distance = coords ? calculateDistance(userLocation.lat, userLocation.lng, coords.lat, coords.lng) : Infinity;
        return { ...branch, distance_km: distance, distance_text: distance !== Infinity ? `${distance.toFixed(1)} km` : null };
      });
    }

    return result;
  }, [branches, branchSearchTerm, userLocation, recentBranches]);

  const proceedToFeedback = (type) => {
    // 🟢 Age Check Validation
    if (isGuest) {
      if (!localStorage.getItem('vocalize_customer_age_group')) {
        setPendingFeedbackType(type);
        setShowAgeModal(true);
        return;
      }
    } else if (user) {
      // userProfile.age_group might be updated locally in handleAgeSelect
      if (!userProfile?.age_group) {
        setPendingFeedbackType(type);
        setShowAgeModal(true);
        return;
      }
    }

    if (!selectedBusiness && !fromQR) {
      toast({ title: t.warningTitle || "Uyarı", description: t.selectBusiness, className: "bg-slate-800 text-white border-none" });
      return;
    }
    const targetBusiness = selectedBusiness || qrInfo?.business_id;
    const targetBranch = selectedBranch || qrInfo?.branch_id;

    if (!targetBusiness || !targetBranch) {
      toast({ title: "Hata", description: "İşletme bilgisi eksik.", variant: "destructive" });
      return;
    }

    const params = new URLSearchParams();
    params.set('type', type);
    params.set('business', targetBusiness);
    params.set('branch', targetBranch);
    if (isGuest) params.set('guest', 'true');
    if (qrInfo?.qr_code) params.set('qr', qrInfo.qr_code);
    params.set('lang', language);
    navigate(`/feedback?${params.toString()}`);
  };

  const handleFeedback = (type) => {
    if (isGuest) {
      const dismissed = localStorage.getItem('vocalize_guest_warning_dismissed');
      if (!dismissed) {
        setPendingFeedbackType(type);
        setDontShowGuestWarning(false);
        setShowGuestWarningModal(true);
        return;
      }
    }
    proceedToFeedback(type);
  };

  const handleLogout = async () => {
    try {
      const { error } = await signOut();
      localStorage.removeItem('vocalize_guest_mode');
      localStorage.removeItem('vocalize_guest_business_id');
      localStorage.removeItem('vocalize_guest_branch_id');
      localStorage.removeItem('vocalize_guest_warning_dismissed');
      localStorage.removeItem('vocalize_last_business');
      localStorage.removeItem('vocalize_last_branch');

      setUser(null);
      setIsGuest(false);
      setSelectedBusiness('');
      setSelectedBranch('');
      setDeleteAccountConfirmed(false);
      navigate('/', { replace: true });
    } catch (error) {
      console.error("Logout error", error);
    }
  };

  const handleRegisterClick = () => { setAuthDefaultTab('register'); setShowAuthModal(true); };
  const handleGuestWarningContinue = () => { if (dontShowGuestWarning) localStorage.setItem('vocalize_guest_warning_dismissed', 'true'); setShowGuestWarningModal(false); if (pendingFeedbackType) proceedToFeedback(pendingFeedbackType); };
  const handleGuestWarningLogin = () => { setShowGuestWarningModal(false); setAuthDefaultTab('login'); setShowAuthModal(true); };

  const handleAuthModalClose = () => {
    setShowAuthModal(false);
    if (authUser && isGuest) {
      localStorage.removeItem('vocalize_guest_mode');
      localStorage.removeItem('vocalize_guest_business_id');
      localStorage.removeItem('vocalize_guest_branch_id');
      window.location.reload();
    }
  };


  const handleBusinessSuggestion = async (e) => {
    e.preventDefault();
    if (!suggestedBusinessName.trim() || !suggestedBusinessLocation.trim()) {
      toast({ title: t.businessSuggestion.errorMsg, variant: "destructive" });
      return;
    }
    setSuggestingBusiness(true);
    try {
      const { error } = await supabase.from('vocalize_support_tickets').insert({
        email: user?.email || 'guest@vocalize.app',
        message: `[İŞLETME ÖNERİSİ]\nİsim: ${suggestedBusinessName}\nKonum: ${suggestedBusinessLocation}`,
        images: [],
        origin: 'business_suggestion'
      });
      if (error) throw error;
      toast({ title: t.businessSuggestion.successMsg, className: "bg-teal-600 text-white border-none" });
      setSuggestedBusinessName('');
      setSuggestedBusinessLocation('');
    } catch (err) {
      console.error('Error:', err);
      toast({ title: language === 'tr' ? 'Hata' : 'Error', description: language === 'tr' ? 'Bir hata oluştu, lütfen tekrar deneyin.' : 'An error occurred, please try again.', variant: "destructive" });
    } finally {
      setSuggestingBusiness(false);
    }
  };


  const handleSoftDeleteAccount = async () => {
    if (!deleteAccountConfirmed) {
      toast({ title: language === 'tr' ? 'Hata' : 'Error', description: language === 'tr' ? 'Lütfen onay kutusunu işaretleyin' : 'Please check the confirmation box', variant: "destructive" });
      return;
    }
    if (!user?.id) return;
    setIsDeletingAccount(true);
    try {
      const { error } = await supabase.rpc('delete_user_account');
      if (error) throw error;
      toast({ title: language === 'tr' ? 'Hesap Silindi' : 'Account Deleted', description: language === 'tr' ? 'Verileriniz anonimleştirildi ve hesabınız kapatıldı.' : 'Your data has been anonymized and account closed.', className: "bg-red-600 text-white border-none" });
      setShowSettingsModal(false);
      setShowDeleteConfirmModal(false);
      await signOut();
      navigate('/', { replace: true });
    } catch (err) {
      console.error('Delete account error:', err);
      toast({ title: language === 'tr' ? 'Hata' : 'Error', description: err.message || (language === 'tr' ? 'Hesap silinirken bir hata oluştu.' : 'An error occurred while deleting account.'), variant: "destructive" });
    } finally {
      setIsDeletingAccount(false);
    }
  };

  const filteredAndSortedFeedbacks = useMemo(() => {
    let filtered = feedbackList;
    if (filterBranch !== 'all') filtered = filtered.filter(f => f.branches?.branch_name_tr === filterBranch);
    if (filterType !== 'all') filtered = filtered.filter(f => f.feedback_type === filterType);
    if (filterStatus !== 'all') {
      filtered = filtered.filter(f => {
        const isOld = isOlderThan48Hours(f.created_at);
        let statusKey = 'new';
        if (f.status === 'resolved' || f.status === 'auto_resolved' || isOld) statusKey = 'resolved';
        else if (f.status === 'viewed' || f.status === 'in_progress') statusKey = 'in_progress';
        return filterStatus === statusKey;
      });
    }
    return [...filtered].sort((a, b) => sortOrder === 'newest' ? new Date(b.created_at) - new Date(a.created_at) : new Date(a.created_at) - new Date(b.created_at));
  }, [feedbackList, filterBranch, filterType, filterStatus, sortOrder]);

  const uniqueBranches = useMemo(() => [...new Set(feedbackList.map(f => f.branches?.branch_name_tr).filter(Boolean))], [feedbackList]);
  const activeFilterCount = [filterBranch !== 'all', filterStatus !== 'all'].filter(Boolean).length;

  const GuestCTA = ({ title, icon }) => (
    <div className="bg-slate-900/50 border border-dashed border-slate-700 rounded-xl p-8 md:p-12 text-center animate-in fade-in zoom-in-95 duration-500">
      <div className="bg-slate-800/80 p-6 rounded-full inline-flex mb-6">{icon || <UserPlus className="h-10 w-10 text-teal-500" />}</div>
      <h3 className="text-xl md:text-2xl font-bold text-white mb-3 break-words">{title}</h3>
      <p className="text-slate-400 mb-8 max-w-lg mx-auto break-words leading-relaxed">{t.guestCTA.subtext}</p>
      <Button onClick={handleRegisterClick} className="bg-teal-600 hover:bg-teal-700 text-white px-8 py-6 rounded-xl font-bold text-lg hover:scale-105"><UserPlus className="mr-2 h-5 w-5" /> {t.guestCTA.button}</Button>
    </div>
  );

  const EmptyStateVisitedBusinesses = () => (
    <div className="bg-slate-900/50 border border-dashed border-slate-700 rounded-xl p-12 md:p-16 text-center animate-in fade-in zoom-in-95 duration-500">
      <div className="bg-slate-800/80 p-8 rounded-full inline-flex mb-6 shadow-lg">
        <QrCode className="h-12 w-12 text-teal-500 animate-pulse" />
      </div>
      <h3 className="text-2xl md:text-3xl font-bold text-white mb-4 break-words">{t.noVisitedBusiness}</h3>
      <p className="text-slate-400 mb-2 max-w-lg mx-auto break-words leading-relaxed text-base">
        {t.startWithQR}
      </p>
      <p className="text-slate-500 text-sm max-w-lg mx-auto break-words leading-relaxed">
        {language === 'tr' ? 'İşletmelerin QR kodlarını okutarak başlayabilirsiniz.' : 'You can get started by scanning QR codes from businesses.'}
      </p>
    </div>
  );

  if (isLoading) {
    return (<div className="min-h-screen flex flex-col items-center justify-center bg-[#0f172a]"><Loader2 className="animate-spin h-10 w-10 text-teal-500 mb-4" /><p className="text-slate-400 font-medium">{language === 'tr' ? 'Yükleniyor...' : 'Loading...'}</p></div>);
  }

  const logoUrl = "faviconbeyaz.png";

  return (
    <div className="min-h-screen bg-[#0f172a] font-sans text-white overflow-x-hidden relative">
      <header className="bg-slate-900 border-b border-slate-800 px-4 md:px-6 py-4 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="hidden md:block p-2 hover:bg-slate-800 rounded-lg transition-colors"><Menu className="h-6 w-6 text-slate-400 hover:text-white" /></button>
            <div className="flex items-center gap-3"><img src={logoUrl} alt="Vocalize" className="h-10 w-10 md:h-12 md:w-12 object-contain" /><h1 className="text-xl md:text-2xl font-bold text-white tracking-tight">Vocalize</h1></div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex bg-slate-800 rounded-lg p-1">
              <button onClick={() => setLanguage('tr')} className={`px-2 md:px-3 py-1 text-xs md:text-sm rounded-md transition-colors font-medium ${language === 'tr' ? 'bg-teal-600 text-white' : 'text-slate-400 hover:text-white'}`}>TR</button>
              <button onClick={() => setLanguage('en')} className={`px-2 md:px-3 py-1 text-xs md:text-sm rounded-md transition-colors font-medium ${language === 'en' ? 'bg-teal-600 text-white' : 'text-slate-400 hover:text-white'}`}>EN</button>
            </div>
          </div>
        </div>
      </header>

      <aside className={`hidden md:flex flex-col fixed left-0 top-16 h-[calc(100vh-4rem)] bg-slate-900 border-r border-slate-800 z-20 transition-all duration-300 ${sidebarOpen ? 'w-64' : 'w-0 overflow-hidden'}`}>
        <nav className="p-4 space-y-2 flex-1">
          <button onClick={() => setCurrentView('dashboard')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors font-medium ${currentView === 'dashboard' ? 'bg-teal-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}><Home className="h-5 w-5" /><span>{t.home}</span></button>
          <button onClick={() => setCurrentView('feedbacks')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors font-medium ${currentView === 'feedbacks' ? 'bg-teal-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}><List className="h-5 w-5" /><span>{t.myFeedbacks}</span></button>
          <button onClick={() => setCurrentView('stats')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors font-medium ${currentView === 'stats' ? 'bg-teal-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}><TrendingUp className="h-5 w-5" /><span>{t.stats}</span></button>
        </nav>
        <div className="p-4 border-t border-slate-800 bg-slate-900/50 space-y-2">
          <button onClick={() => setSupportModalOpen(true)} className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white transition-colors font-medium"><MessageCircle className="h-5 w-5 text-teal-500" /><span>{t.supportItem}</span></button>
          <button onClick={() => setShowSettingsModal(true)} className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white transition-colors font-medium"><Settings className="h-5 w-5" /><span>{t.settings}</span></button>
        </div>
      </aside>

      <main className={`min-h-screen bg-[#0f172a] transition-all duration-300 ${sidebarOpen ? 'md:ml-64' : 'md:ml-0'} pb-20 md:pb-6 flex flex-col justify-between`}>
        <div className="max-w-6xl mx-auto px-4 py-6 w-full">
          {currentView === 'dashboard' && (
            <div className="animate-in fade-in duration-500">
              <ComponentErrorBoundary name="Dashboard Header">
                <div className="mb-8">
                  <h1 className="text-3xl md:text-4xl font-bold text-white mb-2 break-words">{isGuest ? t.guestWelcome : `${t.welcome}${user?.user_metadata?.first_name ? ', ' + user.user_metadata.first_name : ''}`}</h1>
                  <p className="text-slate-400 text-sm md:text-base">{t.subtitle}</p>
                </div>
              </ComponentErrorBoundary>

              <ComponentErrorBoundary name="Business & Feedback Actions">
                {selectedBusiness ? (
                  <div className="bg-gradient-to-r from-green-500/20 to-green-600/20 border border-green-500/50 p-6 rounded-xl mb-8 animate-in fade-in slide-in-from-top-4 duration-500">
                    <div className="flex items-center gap-4">
                      <div className="bg-green-500/20 p-3 rounded-full shrink-0"><Building2 className="h-8 w-8 text-green-400" /></div>
                      <div>
                        <h3 className="text-white font-bold text-lg break-words">{businessName || 'İşletme Seçili'}</h3>
                        {branchName && <p className="text-green-200 text-sm break-words">{branchName}</p>}
                        <button
                          onClick={() => {
                            setSelectedBusiness('');
                            setSelectedBranch('');
                            localStorage.removeItem('vocalize_last_business');
                            localStorage.removeItem('vocalize_last_branch');

                            const params = new URLSearchParams(searchParams);
                            params.delete('business');
                            params.delete('branch');
                            if (isGuest) params.set('guest', 'true');
                            params.set('lang', language);

                            navigate(`${location.pathname}?${params.toString()}`, { replace: true });
                          }}
                          className="text-xs text-green-300 underline hover:text-green-200 mt-1 block"
                        >
                          {t.changeInfo}
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
                      <button
                        onClick={() => handleFeedback('complaint')}
                        className="group relative bg-gradient-to-br from-red-500/50 via-red-600/40 to-red-700/50 border-2 border-red-500/80 p-5 rounded-2xl hover:border-red-400 hover:shadow-lg hover:shadow-red-500/50 transition-all duration-300 hover:scale-105 overflow-hidden"
                      >
                        <div className="absolute inset-0 bg-gradient-to-br from-red-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        <div className="relative flex items-center gap-3">
                          <div className="bg-red-500/40 p-3 rounded-xl group-hover:bg-red-500/60 transition-all group-hover:scale-110">
                            <AlertTriangle className="h-7 w-7 text-red-100 group-hover:text-white transition-colors" />
                          </div>
                          <div className="text-left">
                            <h3 className="font-bold text-red-50 text-base group-hover:text-white transition-colors">{t.complaint}</h3>
                            <p className="text-xs text-red-100/80 group-hover:text-red-50 transition-colors">{t.complaintDesc}</p>
                          </div>
                        </div>
                      </button>

                      <button
                        onClick={() => handleFeedback('suggestion')}
                        className="group relative bg-gradient-to-br from-blue-500/50 via-blue-600/40 to-indigo-600/50 border-2 border-blue-500/80 p-5 rounded-2xl hover:border-blue-400 hover:shadow-lg hover:shadow-blue-500/50 transition-all duration-300 hover:scale-105 overflow-hidden"
                      >
                        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        <div className="relative flex items-center gap-3">
                          <div className="bg-blue-500/40 p-3 rounded-xl group-hover:bg-blue-500/60 transition-all group-hover:scale-110">
                            <Lightbulb className="h-7 w-7 text-blue-100 group-hover:text-white transition-colors" />
                          </div>
                          <div className="text-left">
                            <h3 className="font-bold text-blue-50 text-base group-hover:text-white transition-colors">{t.suggestion}</h3>
                            <p className="text-xs text-blue-100/80 group-hover:text-blue-50 transition-colors">{t.suggestionDesc}</p>
                          </div>
                        </div>
                      </button>

                      <button
                        onClick={() => handleFeedback('review')}
                        className="group relative bg-gradient-to-br from-yellow-500/50 via-amber-500/40 to-orange-500/50 border-2 border-yellow-500/80 p-5 rounded-2xl hover:border-yellow-400 hover:shadow-lg hover:shadow-yellow-500/50 transition-all duration-300 hover:scale-105 overflow-hidden"
                      >
                        <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        <div className="relative flex items-center gap-3">
                          <div className="bg-yellow-500/40 p-3 rounded-xl group-hover:bg-yellow-500/60 transition-all group-hover:scale-110">
                            <Star className="h-7 w-7 text-yellow-100 group-hover:text-white transition-colors" />
                          </div>
                          <div className="text-left">
                            <h3 className="font-bold text-yellow-50 text-base group-hover:text-white transition-colors">{t.review}</h3>
                            <p className="text-xs text-yellow-100/80 group-hover:text-yellow-50 transition-colors">{t.reviewDesc}</p>
                          </div>
                        </div>
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="bg-slate-800/30 border border-slate-700/20 rounded-lg p-4 mb-6"><div className="text-slate-400 text-sm leading-relaxed text-center space-y-1"><p>{t.qrAutoDetect1}</p><p>{t.qrAutoDetect2}</p><p className="text-slate-500 text-xs opacity-70">{t.qrAutoDetect3}</p></div></div>

                    <div className="mb-8 relative group">

                      <h2 className="text-2xl font-bold text-white mb-6">{t.visitedBusinesses}</h2>
                      {businesses.length === 0 ? (
                        <EmptyStateVisitedBusinesses />
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                          {businesses.map((biz) => (
                            <button
                              key={biz.id}
                              onClick={() => handleBusinessCardClick(biz.id)}
                              className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 rounded-xl p-6 hover:border-teal-500/50 transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-teal-500/10 group text-left"
                            >
                              <div className="flex items-start justify-between mb-4">
                                <div className="bg-teal-600/20 p-3 rounded-lg group-hover:bg-teal-600/30 transition">
                                  <Building2 className="h-6 w-6 text-teal-400" />
                                </div>
                                <ChevronRight className="h-5 w-5 text-slate-400 group-hover:text-teal-400 transition-all group-hover:translate-x-1" />
                              </div>
                              <h3 className="text-lg font-bold text-white mb-2 group-hover:text-teal-300 transition-colors break-words line-clamp-2">
                                {biz.business_name}
                              </h3>
                              <p className="text-sm text-slate-400 group-hover:text-slate-300 transition-colors">
                                {t.selectBranchForFeedback}
                              </p>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {businesses.length > 0 && (
                      <>
                        <div className="bg-slate-800/30 border border-slate-700/20 rounded-lg p-4 my-8">
                          <div className="text-slate-400 text-sm leading-relaxed text-center">
                            <p>{t.infoBox}</p>
                          </div>
                        </div>
                      </>
                    )}
                  </>
                )}

              </ComponentErrorBoundary>

              {isGuest && businesses.length > 0 && (
                <ComponentErrorBoundary name="Guest Registration Card">
                  <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/30 rounded-xl p-6 mt-8">
                    <div className="flex items-start gap-4">
                      <Info className="h-6 w-6 text-blue-400 flex-shrink-0 mt-1" />
                      <div>
                        <h3 className="text-white font-semibold mb-2">{t.guestTracking}</h3>
                        <p className="text-slate-300 text-sm mb-4 break-words">{t.guestTrackingDesc}</p>
                        <button onClick={handleRegisterClick} className="bg-teal-600 hover:bg-teal-700 text-white px-6 py-2 rounded-lg font-medium transition-colors">{t.register}</button>
                      </div>
                    </div>
                  </div>
                </ComponentErrorBoundary>
              )}

              {businesses.length > 0 && (
                <div className="mt-8 bg-red-500/20 border-l-4 border-red-500 p-4 rounded-r-lg flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-300 break-words leading-relaxed">{t.warningText}</p>
                </div>
              )}
            </div>
          )}

          {currentView === 'feedbacks' && (
            <div className="animate-in fade-in duration-500">
              <ComponentErrorBoundary name="Feedbacks Header & Filters">
                <div className="mb-8"><h1 className="text-3xl md:text-4xl font-bold text-white mb-2 break-words">{t.myFeedbacks}</h1><p className="text-slate-400">{t.allFeedbacks}</p></div>
                {isGuest ? null : (
                  <div className="bg-slate-800 p-4 rounded-lg border border-slate-700 mb-6 flex flex-col md:flex-row items-start md:items-center gap-4 justify-between">
                    <div className="flex flex-col sm:flex-row w-full md:w-auto gap-4 flex-1">
                      <div className="flex flex-col w-full md:max-w-xs"><label className="text-xs text-slate-400 mb-1 font-semibold uppercase ml-1">{t.formType}</label><div className="relative"><select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-2.5 text-white text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent transition appearance-none pr-10 font-medium"><option value="all">{t.all}</option><option value="complaint">🔴 {t.complaintBadge}</option><option value="suggestion">💡 {t.suggestionBadge}</option><option value="review">⭐ {t.reviewBadge}</option></select><ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 pointer-events-none" /></div></div>
                    </div>
                    <div className="w-full md:w-auto">
                      <Popover>
                        <PopoverTrigger asChild>
                          <button className={`w-full md:w-auto flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-all duration-200 ${activeFilterCount > 0 ? 'bg-teal-600 text-white hover:bg-teal-700 shadow-lg shadow-teal-900/20' : 'bg-slate-700 text-slate-300 hover:bg-slate-600 hover:text-white'}`}>
                            <Filter className="h-4 w-4" /><span>{t.advancedFilter}</span>{activeFilterCount > 0 && <span className="bg-teal-500/20 text-teal-400 border border-teal-500/30 text-xs font-bold px-2 py-0.5 rounded-full ml-1">{activeFilterCount}</span>}
                          </button>
                        </PopoverTrigger>
                        <PopoverContent className="w-80 bg-slate-800 border-slate-700 text-white p-4">
                          <div className="space-y-4">
                            <div className="space-y-2">
                              <h4 className="font-medium text-sm text-slate-300">{t.branch}</h4>
                              <select value={filterBranch} onChange={(e) => setFilterBranch(e.target.value)} className="w-full bg-slate-900 border border-slate-600 rounded-md px-3 py-2 text-sm text-white">
                                <option value="all">{t.filterAllBranches}</option>
                                {uniqueBranches.map(b => (<option key={b} value={b}>{b}</option>))}
                              </select>
                            </div>
                            <div className="space-y-2">
                              <h4 className="font-medium text-sm text-slate-300">{t.status}</h4>
                              <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="w-full bg-slate-900 border border-slate-600 rounded-md px-3 py-2 text-sm text-white">
                                <option value="all">{t.filterAllStatuses}</option>
                                <option value="new">{t.delivered}</option>
                                <option value="in_progress">{t.reviewing}</option>
                                <option value="resolved">{t.resolved}</option>
                              </select>
                            </div>
                            <div className="space-y-2">
                              <h4 className="font-medium text-sm text-slate-300">{t.sortBy}</h4>
                              <select value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} className="w-full bg-slate-900 border border-slate-600 rounded-md px-3 py-2 text-sm text-white">
                                <option value="newest">{t.newest}</option>
                                <option value="oldest">{t.oldest}</option>
                              </select>
                            </div>
                            <div className="pt-2">
                              <Button variant="outline" size="sm" onClick={() => { setFilterBranch('all'); setFilterStatus('all'); setSortOrder('newest'); }} className="w-full border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-white h-8 text-xs">{t.cancel}</Button>
                            </div>
                          </div>
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>
                )}
              </ComponentErrorBoundary>

              <ComponentErrorBoundary name="Feedbacks List">
                {isGuest ? (
                  <GuestCTA title={t.guestCTA.feedbackTitle} />
                ) : (
                  <div className="relative group">

                    {feedbackList.length === 0 ? (
                      <div className="bg-slate-900/50 border border-dashed border-slate-700 rounded-xl p-12 text-center">
                        <MessageSquare className="h-16 w-16 text-slate-600 mx-auto mb-4" />
                        <h3 className="text-xl font-semibold text-white mb-2 break-words">{t.noFeedbacks}</h3>
                        <p className="text-slate-400 mb-6 break-words">{t.sendFirstFeedback}</p>
                        <button onClick={() => setCurrentView('dashboard')} className="bg-teal-600 hover:bg-teal-700 text-white px-6 py-3 rounded-lg font-semibold transition">{t.sendFeedbackBtn}</button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {filteredAndSortedFeedbacks.length === 0 ? (
                          <div className="text-center py-12 bg-slate-900 rounded-lg border border-slate-800">
                            <Filter className="h-12 w-12 text-slate-600 mx-auto mb-3" />
                            <p className="text-slate-400 font-medium">Seçilen filtrelerle eşleşen geri bildirim bulunamadı.</p>
                          </div>
                        ) : (
                          filteredAndSortedFeedbacks.map((feedback) => (
                            <div key={feedback.id} className="bg-slate-900 border border-slate-800 rounded-lg hover:border-slate-600 transition-all cursor-pointer active:scale-[0.99] flex flex-col" onClick={() => setSelectedFeedback(feedback)}>
                              <div className="p-4">
                                <div className="flex items-center justify-between mb-3 gap-4">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap border ${feedback.feedback_type === 'complaint' ? 'bg-red-500/10 text-red-400 border-red-500/20' : feedback.feedback_type === 'suggestion' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'}`}>{feedback.feedback_type === 'complaint' ? `🔴 ${t.complaintBadge}` : feedback.feedback_type === 'suggestion' ? `💡 ${t.suggestionBadge}` : `⭐ ${t.reviewBadge}`}</span>
                                    <span className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap border ${getStatusBadge(feedback, t).color === 'blue' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : getStatusBadge(feedback, t).color === 'orange' ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' : 'bg-green-500/10 text-green-400 border-green-500/20'}`}>{getStatusBadge(feedback, t).icon} {getStatusBadge(feedback, t).label}</span>
                                    {(feedback.general_eval_rating || feedback.general_eval_comment) && (
                                      <span className="px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap border bg-teal-500/10 text-teal-400 border-teal-500/20">
                                        🌟 {language === 'tr' ? 'Genel Değ.' : 'Gen. Eval.'}
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2 flex-shrink-0">
                                    {feedback.feedback_images?.length > 0 && (
                                      <div className="flex items-center gap-1 px-2 py-1 rounded bg-slate-800/50 border border-slate-700 text-xs text-teal-500 whitespace-nowrap">
                                        <ImageIcon className="h-3 w-3 flex-shrink-0" />
                                        <span>{feedback.feedback_images.length}</span>
                                      </div>
                                    )}
                                    <span className="text-sm text-slate-500 whitespace-nowrap">{formatDate(feedback.created_at, language)}</span>
                                  </div>
                                </div>
                                <p className="text-sm text-slate-400 mb-2 break-words">📍 {feedback.branches?.branch_name_tr || t.unknown}</p>
                                {feedback.rating && <div className="flex items-center gap-0.5 mb-2">{[...Array(5)].map((_, i) => <Star key={i} className={`h-4 w-4 ${i < feedback.rating ? 'text-yellow-500 fill-yellow-500' : 'text-gray-600'}`} />)}</div>}
                                {feedback.message && <p className="text-slate-300 text-sm line-clamp-2 break-all leading-relaxed">{feedback.message}</p>}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                )}
              </ComponentErrorBoundary>
            </div>
          )}

          {currentView === 'stats' && (
            <div className="animate-in fade-in duration-500">
              <ComponentErrorBoundary name="Stats Header">
                <div className="mb-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative group">

                  <div className="flex items-center gap-3 flex-wrap">
                    <h1 className="text-3xl md:text-4xl font-bold text-white break-words">{t.stats}</h1>
                    {!isGuest && stats.userTitle && (
                      <Popover open={showTitleInfo} onOpenChange={setShowTitleInfo}>
                        <PopoverTrigger asChild>
                          <button className="bg-teal-600/20 text-teal-300 border border-teal-500/30 px-3 py-1 rounded-full text-sm font-semibold whitespace-nowrap animate-in fade-in zoom-in-75 duration-500 hover:bg-teal-600/30 transition-all cursor-pointer group relative">
                            ✨ {stats.userTitle} <HelpCircle className="inline ml-1 h-3 w-3 opacity-70 group-hover:opacity-100" />
                          </button>
                        </PopoverTrigger>
                        <PopoverContent className="bg-slate-900 border-slate-800 text-white p-4 w-80 shadow-lg" side="bottom" align="start">
                          <div className="space-y-3">
                            <div className="flex items-center gap-2">
                              <span className="text-lg">✨</span>
                              <h4 className="font-bold text-teal-300 text-sm">{stats.userTitle}</h4>
                            </div>
                            <p className="text-slate-300 text-xs leading-relaxed">
                              {stats.userTitle === t.userTitle.vocalizAmbassador
                                ? t.userTitleInfo.vocalizAmbassadorDesc
                                : stats.userTitle === t.userTitle.experiencedObserver
                                  ? t.userTitleInfo.experiencedObserverDesc
                                  : t.userTitleInfo.newVoiceDesc}
                            </p>
                            <div className="pt-2 border-t border-slate-800">
                              <p className="text-slate-400 text-xs font-medium mb-1">{t.userTitleInfo.nextLevel}</p>
                              <p className="text-teal-400 text-xs">
                                {stats.userTitle === t.userTitle.vocalizAmbassador
                                  ? t.userTitleInfo.maxLevel
                                  : stats.userTitle === t.userTitle.experiencedObserver
                                    ? t.userTitleInfo.nextLevelExperienced
                                    : t.userTitleInfo.nextLevelNewVoice}
                              </p>
                            </div>
                          </div>
                        </PopoverContent>
                      </Popover>
                    )}
                  </div>
                </div>
              </ComponentErrorBoundary>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <ComponentErrorBoundary name="Stats Main Chart & KPIs">
                  {isGuest ? (
                    <GuestCTA title={t.guestCTA.statsTitle} icon={<TrendingUp className="h-10 w-10 text-teal-500" />} />
                  ) : stats.total === 0 ? (
                    <div className="text-center py-16 bg-slate-900 rounded-lg border border-slate-800">
                      <BarChart className="h-16 w-16 text-slate-600 mx-auto mb-4" />
                      <p className="text-slate-400 font-medium text-lg">{t.statsPage.noData}</p>
                    </div>
                  ) : (
                    <>
                      <div className="lg:col-span-1 bg-slate-900 border border-slate-800 rounded-xl p-8 shadow-lg flex flex-col items-center justify-center hover:border-slate-700 transition-colors relative group">

                        <div style={{
                          background: `conic-gradient(
                          rgb(239, 68, 68) 0deg ${((stats.complaints / stats.total) * 360)}deg,
                          rgb(59, 130, 246) ${((stats.complaints / stats.total) * 360)}deg ${(((stats.complaints + stats.suggestions) / stats.total) * 360)}deg,
                          rgb(234, 179, 8) ${(((stats.complaints + stats.suggestions) / stats.total) * 360)}deg 360deg
                        )`
                        }} className="w-48 h-48 rounded-full flex items-center justify-center mb-6 relative shadow-lg">
                          <div className="w-40 h-40 rounded-full bg-slate-900 flex flex-col items-center justify-center border-4 border-slate-900">
                            <p className="text-3xl font-bold text-white">{stats.total}</p>
                            <p className="text-xs text-slate-400 mt-1">{t.totalFeedbacksCount}</p>
                          </div>
                        </div>

                        <div className="w-full space-y-2 mt-2">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-red-500 flex-shrink-0"></div>
                            <span className="text-sm text-slate-300">{t.complaintBadge}: {stats.complaints}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-blue-500 flex-shrink-0"></div>
                            <span className="text-sm text-slate-300">{t.suggestionBadge}: {stats.suggestions}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-yellow-500 flex-shrink-0"></div>
                            <span className="text-sm text-slate-300">{t.reviewBadge}: {stats.reviews}</span>
                          </div>
                        </div>
                      </div>

                      <div className="lg:col-span-1 space-y-4 relative group">

                        <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-800/50 rounded-xl p-5 shadow-lg hover:border-yellow-500/30 transition-all duration-300 group">
                          <div className="flex items-start justify-between mb-3">
                            <h3 className="text-sm font-semibold text-slate-300 group-hover:text-yellow-300 transition-colors">{t.avgRating}</h3>
                            <Star className="h-5 w-5 text-yellow-500 group-hover:scale-110 transition-transform" />
                          </div>
                          <p className="text-3xl font-bold text-white mb-1">{stats.avgRating ? stats.avgRating.toFixed(1) : '0.0'}</p>
                          <p className="text-xs text-slate-500">/5.0</p>
                        </div>

                        <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-800/50 rounded-xl p-5 shadow-lg hover:border-green-500/30 transition-all duration-300 group">
                          <div className="flex items-start justify-between mb-3">
                            <h3 className="text-sm font-semibold text-slate-300 group-hover:text-green-300 transition-colors">{t.mostVisited}</h3>
                            <MapPin className="h-5 w-5 text-green-500 group-hover:scale-110 transition-transform" />
                          </div>
                          <p className="text-base font-bold text-white truncate mb-1" title={stats.topBranch}>{stats.topBranch || t.unknown}</p>
                          <p className="text-xs text-slate-500">{stats.topBranchCount} {t.visits}</p>
                        </div>

                        <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-800/50 rounded-xl p-5 shadow-lg hover:border-red-500/30 transition-all duration-300 group">
                          <div className="flex items-start justify-between mb-3">
                            <h3 className="text-sm font-semibold text-slate-300 group-hover:text-red-300 transition-colors">{language === 'tr' ? 'En Çok Sorun' : 'Most Issues'}</h3>
                            <AlertTriangle className="h-5 w-5 text-red-500 group-hover:scale-110 transition-transform" />
                          </div>
                          <p className="text-base font-bold text-white truncate mb-1" title={stats.worstBranch}>{stats.worstBranch || t.unknown}</p>
                          <p className="text-xs text-slate-500">{stats.worstBranchCount} {t.complaintBadge}</p>
                        </div>
                      </div>
                    </>
                  )}
                </ComponentErrorBoundary>

                <ComponentErrorBoundary name="Business Suggestion Form">
                  <div className="lg:col-span-1 bg-gradient-to-br from-teal-600/20 to-teal-700/10 border border-teal-500/30 rounded-xl p-6 shadow-lg hover:border-teal-500/50 transition-all duration-300">
                    <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                      <Building2 className="h-5 w-5 text-teal-400" />
                      {t.businessSuggestion.title}
                    </h3>
                    <form onSubmit={handleBusinessSuggestion} className="space-y-3">
                      <div>
                        <label className="text-xs text-slate-300 font-semibold mb-1.5 block">{t.businessSuggestion.businessName}</label>
                        <Input type="text" placeholder={t.businessSuggestion.businessNamePlaceholder} value={suggestedBusinessName} onChange={(e) => setSuggestedBusinessName(e.target.value)} className="bg-slate-800/80 border-slate-700 text-white text-sm focus:border-teal-500 focus:ring-teal-500/20" required />
                      </div>
                      <div>
                        <label className="text-xs text-slate-300 font-semibold mb-1.5 block">{t.businessSuggestion.location}</label>
                        <Input type="text" placeholder={t.businessSuggestion.locationPlaceholder} value={suggestedBusinessLocation} onChange={(e) => setSuggestedBusinessLocation(e.target.value)} className="bg-slate-800/80 border-slate-700 text-white text-sm focus:border-teal-500 focus:ring-teal-500/20" required />
                      </div>
                      <Button type="submit" disabled={suggestingBusiness} className="w-full bg-teal-600 hover:bg-teal-700 text-white font-semibold mt-4 shadow-lg shadow-teal-900/20 hover:shadow-teal-900/40 transition-all">
                        {suggestingBusiness ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            {language === 'tr' ? 'Gönderiliyor...' : 'Sending...'}
                          </>
                        ) : (
                          <>
                            <Building2 className="h-4 w-4 mr-2" />
                            {t.businessSuggestion.suggest}
                          </>
                        )}
                      </Button>
                    </form>
                  </div>
                </ComponentErrorBoundary>
              </div>
            </div>
          )}
        </div>
      </main>

      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-slate-900 border-t border-slate-800 z-30">
        <div className="flex items-center justify-around py-3">
          <button onClick={() => setCurrentView('dashboard')} className={`flex flex-col items-center gap-1 px-4 py-2 transition-colors ${currentView === 'dashboard' ? 'text-teal-400' : 'text-slate-400 hover:text-white'}`}><Home className="h-6 w-6" /><span className="text-xs font-medium">{t.home}</span></button>
          <button onClick={() => setCurrentView('feedbacks')} className={`flex flex-col items-center gap-1 px-4 py-2 transition-colors ${currentView === 'feedbacks' ? 'text-teal-400' : 'text-slate-400 hover:text-white'}`}><List className="h-6 w-6" /><span className="text-xs font-medium">{t.notifications}</span></button>
          <button onClick={() => setCurrentView('stats')} className={`flex flex-col items-center gap-1 px-4 py-2 transition-colors ${currentView === 'stats' ? 'text-teal-400' : 'text-slate-400 hover:text-white'}`}><TrendingUp className="h-6 w-6" /><span className="text-xs font-medium">{t.statistics}</span></button>
          <button onClick={() => setShowSettingsModal(true)} className="flex flex-col items-center gap-1 px-4 py-2 text-slate-400 hover:text-white transition-colors"><Settings className="h-6 w-6" /><span className="text-xs font-medium">{t.settings}</span></button>
        </div>
      </nav>

      <AuthModal isOpen={showAuthModal} onClose={handleAuthModalClose} defaultTab={authDefaultTab} defaultRole="customer" />

      <Dialog open={showBranchSelector} onOpenChange={setShowBranchSelector}>
        <DialogContent className="bg-slate-900 border-slate-800 text-white max-w-md rounded-2xl p-0 overflow-hidden shadow-2xl">
          <DialogHeader className="p-6 pb-2">
            <DialogTitle className="text-xl font-bold bg-gradient-to-r from-teal-400 to-blue-500 bg-clip-text text-transparent">
              {businesses.find(b => b.id === selectedBusinessForBranches)?.business_name || (language === 'tr' ? 'İşletme' : 'Business')} - {language === 'tr' ? 'Şube Seçin' : 'Select Branch'}
            </DialogTitle>
            <DialogDescription className="text-slate-400 text-sm">
              {language === 'tr' ? 'Geri bildirim vermek istediğiniz şubeyi seçin.' : 'Please select the branch you want to leave feedback for.'}
            </DialogDescription>
          </DialogHeader>

          <div className="px-6 pb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
              <input
                type="text"
                placeholder={language === 'tr' ? "Şube ara..." : "Search branch..."}
                className="w-full bg-slate-800/50 border border-slate-700/50 rounded-xl py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500/50 transition-all placeholder:text-slate-600"
                value={branchSearchTerm}
                onChange={(e) => setBranchSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <div className="max-h-[400px] overflow-y-auto px-6 pb-6 space-y-4 scrollbar-thin scrollbar-thumb-slate-700">
            {isBranchesLoading ? (
              <div className="flex flex-col items-center justify-center py-10">
                <Loader2 className="h-8 w-8 text-teal-500 animate-spin mb-3" />
                <p className="text-slate-400 text-sm">{language === 'tr' ? 'Şubeler yükleniyor...' : 'Loading branches...'}</p>
              </div>
            ) : (() => {
              // Separate branches into pinned and non-pinned
              const pinnedBranches = filteredBranchesForModal.filter(b => {
                const data = recentBranches.find(rb => rb.id === b.id);
                return data?.is_pinned === true;
              });

              const nonPinnedBranches = filteredBranchesForModal.filter(b => {
                const data = recentBranches.find(rb => rb.id === b.id);
                return !data || data.is_pinned !== true;
              });

              // Calculate pagination for non-pinned branches only
              const totalNonPinned = nonPinnedBranches.length;
              const paginatedNonPinned = nonPinnedBranches.slice(
                (branchPage - 1) * branchesPerPage,
                branchPage * branchesPerPage
              );

              const renderBranch = (branch) => {
                const branchData = recentBranches.find(rb => rb.id === branch.id);
                const isPinned = branchData?.is_pinned || false;

                return (
                  <div key={branch.id} className="w-full bg-slate-800/80 hover:bg-slate-700 border border-slate-700 hover:border-teal-500/50 text-white p-4 rounded-xl transition-all flex items-center justify-between group shadow-sm">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleBranchSelectForFeedback(branch.id);
                      }}
                      className="flex-1 text-left flex items-center justify-between"
                    >
                      <div className="flex flex-col">
                        <span className="font-semibold group-hover:text-teal-300 transition-colors">
                          {branch.branch_name_tr}
                        </span>
                        {branch.distance_text && (
                          <span className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
                            <MapPin className="h-3 w-3" /> {branch.distance_text}
                          </span>
                        )}
                      </div>
                      <div className="bg-slate-700 p-2 rounded-lg">
                        <ChevronRight className="h-5 w-5 text-teal-400 transition-all group-hover:translate-x-1" />
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        toggleBranchPin(branch.id);
                      }}
                      className="ml-3 p-2 hover:bg-slate-600 rounded-lg transition-colors"
                    >
                      <Pin className={`h-4 w-4 ${isPinned ? 'text-teal-400 fill-teal-400' : 'text-slate-500 hover:text-teal-400'}`} />
                    </button>
                  </div>
                );
              };

              return (
                <>
                  {/* Pinned Branches Section */}
                  {pinnedBranches.length > 0 && (
                    <div className="space-y-2">
                      <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                        <span className="w-4 h-[1px] bg-slate-800"></span>
                        {language === 'tr' ? 'Pinlenmiş Şubeler' : 'Pinned Branches'} ({pinnedBranches.length})
                      </div>
                      <div className="grid grid-cols-1 gap-2">
                        {pinnedBranches.map(renderBranch)}
                      </div>
                    </div>
                  )}

                  {/* Recent Branches Section (Paginated) */}
                  {nonPinnedBranches.length > 0 && (
                    <div className="space-y-2">
                      <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                        <span className="w-4 h-[1px] bg-slate-800"></span>
                        {language === 'tr' ? 'Tüm Şubeler' : 'All Branches'} ({totalNonPinned})
                      </div>
                      <div className="grid grid-cols-1 gap-2">
                        {paginatedNonPinned.map(renderBranch)}
                      </div>

                      {/* Pagination Controls */}
                      {totalNonPinned > branchesPerPage && (
                        <div className="flex items-center justify-between pt-4 border-t border-slate-800/50 mt-2">
                          <button
                            disabled={branchPage === 1}
                            onClick={() => setBranchPage(prev => Math.max(1, prev - 1))}
                            className="flex items-center gap-1 text-xs font-medium text-slate-400 hover:text-teal-400 disabled:opacity-20 disabled:hover:text-slate-400 transition-colors"
                          >
                            <ChevronLeft className="h-4 w-4" />
                            {language === 'tr' ? 'Önceki' : 'Prev'}
                          </button>

                          <div className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">
                            {branchPage} / {Math.ceil(totalNonPinned / branchesPerPage)}
                          </div>

                          <button
                            disabled={branchPage >= Math.ceil(totalNonPinned / branchesPerPage)}
                            onClick={() => setBranchPage(prev => prev + 1)}
                            className="flex items-center gap-1 text-xs font-medium text-slate-400 hover:text-teal-400 disabled:opacity-20 disabled:hover:text-slate-400 transition-colors"
                          >
                            {language === 'tr' ? 'Sonraki' : 'Next'}
                            <ChevronRight className="h-4 w-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Empty State */}
                  {filteredBranchesForModal.length === 0 && (
                    <div className="text-center py-10">
                      <div className="bg-slate-800/50 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
                        <Search className="h-6 w-6 text-slate-600" />
                      </div>
                      <p className="text-slate-500 text-sm">
                        {language === 'tr' ? 'Aradığınız kriterde şube bulunamadı.' : 'No branches found matching your search.'}
                      </p>
                    </div>
                  )}
                </>
              );
            })()}
          </div>
          <div className="px-6 py-4 border-t border-slate-800">
            <Button
              onClick={() => setShowBranchSelector(false)}
              variant="outline"
              className="w-full bg-slate-700 border-slate-600 text-slate-300 hover:text-white hover:bg-slate-600"
            >
              {language === 'tr' ? 'İptal' : 'Cancel'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!selectedFeedback} onOpenChange={() => {
        setSelectedFeedback(null);
        setPreviewImage(null);
      }}>
        <DialogContent className="bg-slate-900 border-slate-800 text-white max-w-2xl max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden rounded-2xl">
          <DialogHeader className="px-6 pt-4 pb-2 border-b border-slate-800 flex-shrink-0">
            <DialogTitle className="flex items-center gap-2 text-xl font-bold text-white">
              <MessageCircle className="h-6 w-6 text-teal-500" />
              {t.feedbackDetail}
            </DialogTitle>
            <DialogDescription className="sr-only">
              {t.feedbackDetail}
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto overflow-x-hidden px-6 py-4 w-full">
            {selectedFeedback && (
              <div className="space-y-5">
                <div className="flex justify-between items-center pb-3 border-b border-slate-800 flex-wrap gap-2">
                  <div className="flex gap-2 flex-wrap">
                    <span className={`text-xs px-2 py-1 rounded-full border font-semibold whitespace-nowrap ${selectedFeedback.feedback_type === 'complaint' ? 'bg-red-500/10 text-red-400 border-red-500/20' : selectedFeedback.feedback_type === 'suggestion' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'}`}>
                      {selectedFeedback.feedback_type === 'complaint' ? `🔴 ${t.complaintBadge}` : selectedFeedback.feedback_type === 'suggestion' ? `💡 ${t.suggestionBadge}` : `⭐ ${t.reviewBadge}`}
                    </span>
                    <span className={`text-xs px-2 py-1 rounded-full border font-semibold whitespace-nowrap ${getStatusBadge(selectedFeedback, t).color === 'green' ? 'bg-green-500/10 text-green-400 border-green-500/20' : getStatusBadge(selectedFeedback, t).color === 'orange' ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' : 'bg-blue-500/10 text-blue-400 border-blue-500/20'}`}>
                      {getStatusBadge(selectedFeedback, t).icon} {getStatusBadge(selectedFeedback, t).label}
                    </span>
                    {(selectedFeedback.general_eval_rating || selectedFeedback.general_eval_comment) && (
                      <span className="text-xs px-2 py-1 rounded-full border font-semibold whitespace-nowrap bg-teal-500/10 text-teal-400 border-teal-500/20">
                        🌟 {language === 'tr' ? 'Genel Değ.' : 'Gen. Eval.'}
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-slate-500 whitespace-nowrap">{formatDate(selectedFeedback.created_at, language)}</span>
                </div>

                <div>
                  {selectedFeedback.rating && (
                    <div className="mb-3">
                      <p className="text-xs text-slate-400 mb-1">{language === 'tr' ? 'Puan:' : 'Rating:'}</p>
                      <div className="flex items-center gap-1">
                        {[...Array(5)].map((_, i) => <Star key={i} className={`h-4 w-4 ${i < selectedFeedback.rating ? 'text-yellow-500 fill-yellow-500' : 'text-gray-600'}`} />)}
                      </div>
                    </div>
                  )}
                  <h4 className="text-xs font-bold text-teal-500 uppercase mb-2 tracking-wide">{t.yourMessage}</h4>
                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-sm text-slate-200 whitespace-pre-wrap break-words leading-relaxed overflow-hidden">
                    {selectedFeedback.message}
                  </div>
                </div>

                {(selectedFeedback.general_eval_rating || selectedFeedback.general_eval_comment) && (
                  <div>
                    <h4 className="text-xs font-bold text-teal-500 uppercase mb-2 tracking-wide">{t.generalEval}</h4>
                    {selectedFeedback.general_eval_rating && (
                      <div className="flex items-center gap-1 mb-3">
                        {[...Array(5)].map((_, i) => <Star key={i} className={`h-4 w-4 ${i < selectedFeedback.general_eval_rating ? 'text-teal-500 fill-teal-500' : 'text-gray-600'}`} />)}
                      </div>
                    )}
                    {selectedFeedback.general_eval_comment && (
                      <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-sm text-slate-200 whitespace-pre-wrap break-words leading-relaxed overflow-hidden">
                        {selectedFeedback.general_eval_comment}
                      </div>
                    )}
                  </div>
                )}

                {selectedFeedback.feedback_images?.length > 0 && (
                  <div>
                    <h4 className="text-xs font-bold text-teal-500 uppercase mb-3 flex items-center gap-2"><ImageIcon className="w-3 h-3" /> {t.attachedImages}</h4>
                    <div className="grid grid-cols-3 gap-3">
                      {selectedFeedback.feedback_images.map((img, i) => (
                        <div key={i} className="aspect-square rounded-lg overflow-hidden border border-slate-700 bg-black cursor-pointer group relative" onClick={() => setPreviewImage(img)}>
                          <img src={img} className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"><Maximize2 className="w-5 h-5 text-white" /></div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
          <DialogFooter className="px-6 py-4 border-t border-slate-800 flex-shrink-0">
            <Button onClick={() => setSelectedFeedback(null)} className="w-full bg-slate-800 hover:bg-slate-700">{t.close}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {
        previewImage && (
          <div className="fixed inset-0 z-[9999] bg-black/95 flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={(e) => {
            e.stopPropagation();
            setPreviewImage(null);
          }}>
            <button className="absolute top-4 right-4 bg-slate-800 p-2 rounded-full text-white hover:bg-red-600 transition-colors cursor-pointer" type="button" onClick={(e) => {
              e.stopPropagation();
              setPreviewImage(null);
            }}>
              <X className="w-6 h-6" />
            </button>
            <img src={previewImage} className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl" onClick={(e) => e.stopPropagation()} />
          </div>
        )
      }

      <SettingsModal
        isOpen={showSettingsModal}
        onClose={() => {
          setShowSettingsModal(false);
          setDeleteAccountConfirmed(false);
        }}
        user={user}
        isGuest={isGuest}
        language={language}
        t={t}
        handleLogout={handleLogout}
        handleRegisterClick={handleRegisterClick}
        setSupportModalOpen={setSupportModalOpen}
        setShowDeleteConfirmModal={setShowDeleteConfirmModal}
      />

      <DeleteAccountModal
        isOpen={showDeleteConfirmModal}
        onOpenChange={setShowDeleteConfirmModal}
        language={language}
        deleteAccountConfirmed={deleteAccountConfirmed}
        setDeleteAccountConfirmed={setDeleteAccountConfirmed}
        handleSoftDeleteAccount={handleSoftDeleteAccount}
        isDeletingAccount={isDeletingAccount}
      />


      <SupportModal
        isOpen={supportModalOpen}
        onOpenChange={setSupportModalOpen}
        user={user}
        t={t}
        language={language}
      />

      <Dialog open={showGuestWarningModal} onOpenChange={setShowGuestWarningModal}>
        <DialogContent className="bg-slate-900 border-slate-800 text-white">
          <DialogHeader>
            <DialogTitle className="text-orange-400">
              {t.guestWarning.title}
            </DialogTitle>
            <DialogDescription className="text-slate-400 mt-2 sr-only">
              {t.guestWarning.text}
            </DialogDescription>
          </DialogHeader>
          <p className="text-sm text-slate-300">
            {t.guestWarning.text}
          </p>
          <div className="flex items-center gap-2 mt-4 ml-1">
            <Checkbox
              id="dontShow"
              checked={dontShowGuestWarning}
              onCheckedChange={setDontShowGuestWarning}
              className="border-slate-500 data-[state=checked]:bg-teal-600 data-[state=checked]:text-white"
            />
            <label htmlFor="dontShow" className="text-xs text-slate-400 cursor-pointer select-none">
              {t.guestWarning.dontShow}
            </label>
          </div>
          <DialogFooter className="mt-6 flex-row gap-3">
            <Button
              variant="secondary"
              className="flex-1 bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white border border-slate-700"
              onClick={handleGuestWarningContinue}
            >
              {t.guestWarning.continueGuest}
            </Button>
            <Button onClick={handleGuestWarningLogin}>
              {t.guestWarning.loginToSend}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <AgeSelectionModal
        isOpen={showAgeModal}
        onSelect={handleAgeSelect}
      />
    </div >
  );
}
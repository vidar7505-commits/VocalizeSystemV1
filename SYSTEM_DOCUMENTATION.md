# VocalizeSystem V1 — Sistem Dokümantasyonu

> **Son Güncelleme:** 21 Şubat 2026  
> **Versiyon:** V1 (Production)  
> **Deployment:** Vercel + Supabase  

---

## 📋 İçindekiler
1. [Sistem Genel Bakış](#sistem-genel-bakış)
2. [Teknik Yığın](#teknik-yığın)
3. [Proje Yapısı](#proje-yapısı)
4. [Kullanıcı Rolleri ve Auth Akışı](#kullanıcı-rolleri-ve-auth-akışı)
5. [Temel Özellikler](#temel-özellikler)
6. [Sayfalamalar ve Rotalar](#sayfalar-ve-rotalar)
7. [State Yönetimi ve Context'ler](#state-yönetimi-ve-contextler)
8. [Veritabanı (Supabase) Yapısı](#veritabanı-supabase-yapısı)
9. [Edge Functions](#edge-functions)
10. [QR Kod Sistemi](#qr-kod-sistemi)
11. [Realtime Özellikler](#realtime-özellikler)
12. [Çok Dil Desteği (i18n)](#çok-dil-desteği-i18n)
13. [Performans Optimizasyonları](#performans-optimizasyonları)
14. [Güvenlik Notları](#güvenlik-notları)
15. [Son Güncellemeler (Changelog)](#son-güncellemeler-changelog)

---

## Sistem Genel Bakış

**VocalizeSystem**, QR kod tabanlı yönetim sistemidir. İşletmeler; şubelerindeki müşteri geri bildirimlerini QR kodlar aracılığıyla toplar, yönetir ve analiz eder. Sistem üç ana kullanıcı tipini destekler:

- **İşletme Sahibi (Owner):** Tüm şubeleri görebilir, analiz yapabilir
- **Şube Yöneticisi (Branch Manager):** Yalnızca atandığı şubeyi yönetir
- **Müşteri:** QR kod okutarak geri bildirim formunu doldurur (kayıtlı veya misafir)

---

## Teknik Yığın

### Frontend
| Teknoloji | Versiyon | Açıklama |
|---|---|---|
| React | 19.x | UI framework |
| Vite | 7.x | Build tool |
| React Router DOM | 7.x | Client-side routing |
| Tailwind CSS | 3.x | Utility-first CSS |
| Framer Motion | 12.x | Animasyonlar |
| Recharts | 3.x | Grafikler / Charts |
| Three.js | 0.182 | 3D shader animasyonları (Landing) |
| i18next | 25.x | Çok dil desteği (TR / EN) |
| date-fns | 4.x | Tarih işlemleri |

### Backend / BaaS
| Teknoloji | Açıklama |
|---|---|
| Supabase | Auth, PostgreSQL DB, Realtime, Storage, Edge Functions |
| Supabase Realtime | Postgres Changes (WebSocket) tabanlı canlı güncellemeler |

### UI Komponent Kütüphanesi
- **Radix UI** (Dialog, Select, Tabs, Tooltip, Popover, Switch, Slider, Toast, Progress, ScrollArea, vb.)
- **Lucide React** — İkon seti
- **class-variance-authority (CVA)** — Komponent variant yönetimi
- **browser-image-compression** — Görsel yükleme optimizasyonu

---

## Proje Yapısı

```
src/
├── components/
│   ├── ui/                         # Radix tabanlı temel UI bileşenleri (21 dosya)
│   ├── landing/                    # Landing page alt bileşenleri (5 dosya)
│   ├── AdminHeader.jsx             # Admin panel başlık (bildirimler, tema, şube seçici)
│   ├── AdminSidebar.jsx            # Masaüstü sidebar navigasyon
│   ├── AdminMobileNavbar.jsx       # Mobil alt navigasyon çubuğu
│   ├── AuthModal.jsx               # Giriş / Üye ol modal
│   ├── AgeSelectionModal.jsx       # Müşteri yaş seçimi
│   ├── BranchSelector.jsx          # Şube seçici dropdown
│   ├── ComponentErrorBoundary.jsx  # Bileşen bazlı hata sınırı
│   ├── GlobalErrorBoundary.jsx     # Uygulama geneli hata sınırı
│   ├── CustomerProfileModal.jsx    # Müşteri profil detayları (VIP, Sensitive, notlar)
│   ├── FeedbackDetailModal.jsx     # Geri bildirim detay ve yönetim modal
│   ├── InstallationRequestModal.jsx # Kurulum talebi formu
│   ├── Preloader.jsx               # Sayfa yüklenirken gösterilen ekran
│   ├── ProtectedRoute.jsx          # Auth guard HOC
│   ├── ShaderAnimation.jsx         # Three.js WebGL shader animasyonu
│   └── WorldMap.jsx                # SVG dünya haritası bileşeni
│
├── contexts/
│   ├── SupabaseAuthContext.jsx     # Kimlik doğrulama context
│   └── AdminContext.jsx            # Admin panel global state
│
├── hooks/
│   └── useScrollSpy.js             # Scroll takip hook
│
├── pages/
│   ├── AdminPanel.jsx              # Dashboard (KPI, grafikler, son aktiviteler)
│   ├── BulkSetupWizard.jsx         # Toplu QR/şube kurulum sihirbazı
│   ├── CustomerDetail.jsx          # Müşteri detay sayfası
│   ├── CustomerPanel.jsx           # Müşteri paneli (işletme/şube seçim + form)
│   ├── DetailedAnalytics.jsx       # Gelişmiş analiz sayfası
│   ├── FeedbackForm.jsx            # QR yönlendirmeli geri bildirim formu
│   ├── FeedbackManagement.jsx      # Geri bildirim listesi + filtreleme + toplu işlem
│   ├── LandingPage.jsx             # Ana sayfa / pazarlama sayfası
│   ├── NotificationHistory.jsx     # Tüm bildirimler geçmişi
│   ├── QRRedirector.jsx            # QR tarama yönlendirici
│   ├── SettingsPage.jsx            # Hesap ve işletme ayarları
│   ├── UpdatePassword.jsx          # Şifre güncelleme sayfası
│   ├── ErrorTestPage.jsx           # Hata testi sayfası (geliştirici)
│   └── customer/
│       ├── DeleteAccountModal.jsx  # Hesap silme onay modal
│       ├── SettingsModal.jsx       # Müşteri profil ayarları
│       ├── SupportModal.jsx        # Destek talebi formu
│       ├── customerTranslations.js # Müşteri panel çevirileri
│       └── customerUtils.js        # Müşteri panel yardımcı fonksiyonlar
│
├── constants/                      # Sabit veriler
├── layouts/                        # Sayfa layout bileşenleri
└── lib/
    ├── customSupabaseClient.js     # Supabase client yapılandırması
    ├── utils.js                    # Yardımcı fonksiyonlar (formatCustomerName, calculateDelta, vb.)
    └── cacheUtils.js               # Cache temizleme yardımcıları
```

---

## Kullanıcı Rolleri ve Auth Akışı

### Kullanıcı Tipleri

| Tip | `user_type` meta | Açıklama |
|---|---|---|
| Manager (Owner) | `manager` | İşletmeyi kuran, tüm şubelere erişimli yönetici |
| Branch Manager | `manager` | Yalnızca bir şubeye atanmış yönetici |
| Customer (Kayıtlı) | `customer` | Kayıt olmuş müşteri kullanıcı |
| Guest (Misafir) | — | Oturum açmadan form dolduran ziyaretçi |

### Auth Akışı

```
QR Kod Okutma
    │
    ▼
QRRedirector → Şube bilgisini çek
    │
    ├── Manager Session? → Manager Oturumu Kapat → Landing/?openAuth=true
    │
    ├── Customer Session? → customer_qr_scans upsert → /customer-panel?branch=...
    │
    └── Guest? → Landing/?openAuth=true (giriş yönlendirmesi)
```

### SupabaseAuthContext Özellikleri
- `signIn` / `signUp` / `signOut` — Temel auth işlemleri  
- `loginAsGuest` — Misafir modu (`vocalize_guest_mode` localStorage ile persist)  
- `signOut` → `scope: 'local'` kullanılır (session missing hatasını önler)  
- `clearVocalizeCache()` — Çıkış öncesi tüm uygulama cache'i temizlenir  
- `isSigningOut` ref ile double-trigger önlemi  
- Loading state ile `PageLoader` gösterimi sağlanır  

---

## Temel Özellikler

### 1. Admin Dashboard (`AdminPanel.jsx`)

**KPI Kartları (SparklineCard):**
- Toplam Geri Bildirim
- Bekleyen Şikayetler
- Çözülen Geri Bildirimler
- Ortalama Puan

Her kart:
- Önceki dönemle karşılaştırmalı delta (`▲▼`) gösterimi
- 10.000+ değerlerde kompakt format (`K`, `M`)
- Tooltip ile tam değer gösterimi
- Mini sparkline (area chart) arka plan animasyonu

**Grafikler:**
- Yıldız Dağılımı (Horizontal BarChart)
- Geri Bildirim Tipi Dağılımı (Horizontal BarChart)
- `minWidth={0} minHeight={0}` ile Recharts dimension hatası önlemi

**Son Aktiviteler:**
- Son 20 geri bildirim + tüm `escalated` kayıtlar (ayrı query)
- Birleştirip ID bazlı tekilleştirme + tarihe göre sıralama
- VIP / Hassas Müşteri bayrakları
- Misafir İletişim isteği göstergesi (Phone ikonu)
- Acil Banner (kırmızı, pulse animasyonlu)
- Realtime subscription (debounced, 1500ms)

---

### 2. Geri Bildirim Yönetimi (`FeedbackManagement.jsx`)

**Filtreler (Server-Side):**
| Filtre | Değerler |
|---|---|
| Durum | Yeni, Beklemede, İşlemde, Çözüldü, Acil |
| Tip | Şikayet, Öneri, Değerlendirme |
| Bayrak | Hepsi, VIP, Hassas |
| Tarih | Bugün, Son 7/30/90 Gün, Bu Ay, Geçen Ay |
| Arama | Mesaj, isim, e-posta, telefon (ilike) |

**Sayfalama:** Server-side, 50 kayıt/sayfa

**Toplu İşlem:**
- Seçili kayıtları aynı anda farklı statüye güncelleme
- Tümünü Seç / Bırak

**Diğer:**
- Acil filtre, URL state üzerinden (`location.state.filter = 'urgent'`)
- Smooth scroll to feedback list (mobil/masaüstü uyumlu)
- Debounced search (500ms), debounced realtime (1500ms)
- Race condition önlemi (requestId ref)
- Cross-match: `customer_profile_id` olmayan ama e-posta olan kayıtlar için profil eşleştirme

---

### 3. Müşteri Paneli (`CustomerPanel.jsx`)

- İşletme ya da şube seçme
- Mesafe sıralaması (Google Maps URL'leri kullanılır)
- Misafir ve kayıtlı kullanıcı için farklı akış
- Yaş seçim modal (`AgeSelectionModal`)
- QR yönlendirmesinden gelen `business` ve `branch` parametrelerini okuma

---

### 4. Geri Bildirim Formu (`FeedbackForm.jsx`)

Müşteri geri bildirim formudur:
- Şikayet / Öneri / Değerlendirme tipleri
- Yıldız rating
- Görsel yükleme (browser-image-compression kullanılır)
- Ürün fotoğrafı, fiş fotoğrafı
- Misafir iletişim talep seçeneği (`guest_contact_info`)
- Müşteri yaş grubu

---

### 5. Detaylı Analitik (`DetailedAnalytics.jsx`)

- İleri düzey grafikler (trend, yoğunluk heatmap, aktivite takibi)
- KPI delta hesaplamaları (küçük baseline için aşırı % engellemesi)
- `minWidth={0} minHeight={0}` tüm ResponsiveContainer'larda

---

### 6. Müşteri Profil Modal (`CustomerProfileModal.jsx`)

- Müşteri geçmişi, önceki geri bildirimleri
- VIP / Hassas bayrak yönetimi
- İşletme bazlı `business_customers` tablosu üzerinden flag yönetimi
- Admin notları

---

### 7. Landing Page (`LandingPage.jsx`)

- Three.js WebGL shader animasyonu (`ShaderAnimation.jsx`)
- SVG Dünya Haritası (`WorldMap.jsx`)
- Dashboard mockup görsel
- Kurulum talebi formu (`InstallationRequestModal.jsx`)
- Auth modal (`AuthModal.jsx`) entegrasyonu
- SEO: `react-helmet-async` ile meta tag yönetimi
- `Preloader` bileşeni ile smooth fade-in
- Hukuki metinler (`legalTexts.js` dosyasından çekilir)

---

## Sayfalar ve Rotalar

| Rota | Bileşen | Erişim |
|---|---|---|
| `/` | `LandingPage` | Herkese açık |
| `/qr` | `QRRedirector` | Herkese açık |
| `/customer-panel` | `CustomerPanel` | Herkese açık |
| `/form/:branchId` | `FeedbackForm` | Herkese açık |
| `/admin-panel` | `AdminPanel` | Manager only |
| `/admin-panel/feedbacks` | `FeedbackManagement` | Manager only |
| `/admin-panel/analytics` | `DetailedAnalytics` | Manager only |
| `/admin-panel/customers` | `CustomerDetail` | Manager only |
| `/admin-panel/notifications` | `NotificationHistory` | Manager only |
| `/admin-panel/settings` | `SettingsPage` | Manager only |
| `/admin-panel/bulk-setup` | `BulkSetupWizard` | Manager only |
| `/update-password` | `UpdatePassword` | Auth required |
| `/error-test` | `ErrorTestPage` | Dev only |

---

## State Yönetimi ve Context'ler

### `SupabaseAuthContext`
Global auth durumu. Tüm uygulama bu context'e bağlıdır.

```js
{
  user,           // Supabase User objesi
  session,        // Supabase Session
  loading,        // Auth yüklenme durumu
  isGuest,        // Misafir modu aktif mi
  signIn,
  signUp,
  signOut,
  loginAsGuest
}
```

### `AdminContext`
Admin paneli için merkezi state yönetimi.

```js
{
  businessId,           // Aktif işletme ID
  businessName,         // İşletme adı
  businessCreatedAt,    // Kuruluş tarihi (tüm zaman filtresi için)
  branches,             // Şube listesi
  selectedBranchId,     // Seçili şube (owner: 'all' olabilir)
  setSelectedBranchId,  // ProtectedSetter (branch_manager kendi şubesini değiştiremez)
  dateRange,            // Tarih filtresi (today/last7/last30/thisMonth/allTime)
  setDateRange,
  getDateRange,         // Helper: tarih aralığı Date nesneleri
  getDateFilterISO,     // Helper: ISO string dönüşümü
  qrCount,              // QR tarama sayısı
  loading,
  refreshData,          // Manuel yenileme
  // Rol Bazlı Erişim Kontrolü
  userRole,             // 'owner' | 'branch_manager'
  assignedBranchId,     // Branch manager'ın atandığı şube
  isOwner,              // Boolean kısayol
  isBranchManager,      // Boolean kısayol
  // Bildirim Sistemi
  notifications,
  unreadCount,
  escalatedCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  checkEscalatedStatus,
  // Tema
  theme,                // 'dark' | 'light'
  toggleTheme
}
```

---

## Veritabanı (Supabase) Yapısı

### Ana Tablolar

| Tablo | Açıklama |
|---|---|
| `businesses` | İşletme kayıtları (is_special_offer, monthly_fee_override) |
| `branches` | Şubeler (business_id, branch_name_tr, branch_name_en, qr_code, is_active, google_maps_url) |
| `manager_profiles` | Yönetici profilleri (user_id, business_id, role, assigned_branch_id) |
| `feedbacks` | Geri bildirimler (feedback_type, status, rating, message, customer_*, images, branch_id) |
| `customer_profiles` | Kayıtlı müşteri profilleri (name, email, phone, customer_number) |
| `business_customers` | İşletme-müşteri ilişkisi (is_vip, is_sensitive, manager_notes) |
| `qr_scans` | QR tarama logları (branch_id, business_id, user_agent) |
| `customer_qr_scans` | Kayıtlı müşteri QR tarama geçmişi (upsert ile güncellenir) |
| `notifications` | Bildirimler (user_id, business_id, branch_id, is_read, feedbacks FK) |

### Geri Bildirim Durumları

```
new → pending → in_progress → resolved
                             ↓
                          escalated  ← (Acil/Urgent)
```

### Geri Bildirim Tipleri
- `complaint` — Şikayet
- `suggestion` — Öneri  
- `evaluation` / `review` / `rating` — Değerlendirme (UI'da normalize edilir)

---

## Edge Functions

Supabase Edge Functions (`supabase/functions/`):

| Fonksiyon | Açıklama |
|---|---|
| `send-error-email` | Sistem hata bildirimleri için e-posta gönderimi |
| `translate-text` | Metin çeviri işlemleri |

---

## QR Kod Sistemi

**Akış:**

1. Müşteri QR kodu tarar → `/qr?qr=<QR_CODE>` adresine yönlendirilir
2. `QRRedirector` QR kodu okuyarak `branches` tablosundan şube bilgisini çeker
3. `qr_scans` tablosuna tarama logu eklenir
4. `localStorage`'a `vocalize_last_business` ve `vocalize_last_branch` yazılır (iOS güvenli async yazma)
5. Kullanıcı tipine göre:
   - **Manager Session:** Oturum kapatılır → Landing auth sayfasına yönlendirilir
   - **Customer Session:** `customer_qr_scans` güncellenir → `/customer-panel?branch=...` yönlendirilir
   - **Guest:** Landing auth sayfasına yönlendirilir

---

## Realtime Özellikler

Sistem, Supabase Realtime `postgres_changes` ile anlık güncellemeler alır:

| Channel | Tablo | Tetikleyici |
|---|---|---|
| `admin-qr-updates` | `qr_scans` | INSERT → Dashboard yenileme |
| `admin-global-notifications` | `notifications` | INSERT → Yeni bildirim toast |
| `admin-feedback-updates` | `feedbacks` | * → Acil sayacı + istatistik yenileme |
| `admin-dashboard-realtime` | `feedbacks` | * → Dashboard yenileme |
| `feedback_list_realtime` | `feedbacks` | * → Feedback listesi yenileme |

**Debounce:** Tüm realtime subscription'lar 1500ms debounce ile çalışır (flooding ve `374ms violation` önlemi).

---

## Çok Dil Desteği (i18n)

- **Desteklenen Diller:** Türkçe (tr), İngilizce (en)
- **Kütüphane:** `i18next` + `react-i18next` + `i18next-browser-languagedetector`
- **Namespace'ler:** `common`, `admin`, `landing`, `customer`
- **Şube İsimleri:** `branch_name_tr` ve `branch_name_en` ayrı kolonlarla tutulur

---

## Performans Optimizasyonları

- **React.memo:** `SparklineCard`, `FeedbackCard` ve diğer liste bileşenleri
- **useCallback / useMemo:** Tüm event handler'lar ve filtrelenmiş liste hesaplamaları
- **Debounced Search:** 500ms debounce ile `localSearchQuery` → `searchQuery` geçişi
- **Server-Side Pagination:** FeedbackManagement 50 kayıt/sayfa, toplam sayı ayrı count sorgusu
- **Server-Side Count:** PostgREST 1000 satır limitini aşmak için `{ count: 'exact', head: true }`
- **fetchDeep:** `utils.js` içindeki custom paginated fetch yardımcısı (büyük veri setleri için)
- **Race Condition Önlemi:** `fetchRequestId` ref ile eski request'lerin state güncellemesi engellenir
- **Image Compression:** `browser-image-compression` kütüphanesi ile yükleme öncesi sıkıştırma
- **Recharts Fix:** Tüm `ResponsiveContainer`'lara `minWidth={0} minHeight={0}` eklendi
- **Error Boundaries:** `ComponentErrorBoundary` ve `GlobalErrorBoundary` ile izole hata yönetimi

---

## Güvenlik Notları

- **RLS (Row Level Security):** Supabase tablolarında etkin
- **Role-Based Access Control (RBAC):** `manager_profiles.role` alanı ile:
  - `owner`: Tüm şubelere erişim
  - `branch_manager`: Yalnızca `assigned_branch_id` şubesine erişim; şube seçimi kilitli
- **Protected Routes:** `ProtectedRoute` HOC ile `user_type: 'manager'` kontrolü
- **Protected Setter:** `handleSetSelectedBranchId` — Branch manager'ların şube değiştirmesi engellenir
- **signOut scope:** `{ scope: 'local' }` ile yalnızca aktif cihaz oturumu kapatılır
- **Token:** Supabase JWT tabanlı auth

---

## Son Güncellemeler (Changelog)

### Şubat 2026

#### 🟢 Rol Tabanlı Erişim Kontrolü (RBAC)
- `manager_profiles` tablosuna `role` ve `assigned_branch_id` kolonları eklendi
- `AdminContext`'e `userRole`, `assignedBranchId`, `isOwner`, `isBranchManager` state'leri eklendi
- Branch manager'lar yalnızca kendi şubelerinin verisini görebilir ve şubeyi değiştiremez
- QR count sorgusu, branch manager için atanmış şube ile filtrelenir

#### 🟢 Bildirim Sistemi Merkezi Hale Getirildi
- `notifications`, `unreadCount`, `escalatedCount` state'leri `AdminContext`'e taşındı
- `AdminHeader`, `AdminPanel`, `FeedbackManagement` bu merkezi state'i kullanmaya başladı
- `checkEscalatedStatus` ile acil geri bildirim sayısı gerçek zamanlı takip edilir

#### 🟢 Realtime Subscription Kanalları Ayrıldı
- QR, Bildirim ve Feedback için 3 ayrı Supabase kanalı (`AdminContext`)
- Debounce (1500ms) ile flooding ve console violation önlemi

#### 🟢 Recharts Dimension Hataları Giderildi
- Tüm `ResponsiveContainer` bileşenlerine `minWidth={0} minHeight={0}` eklendi (`AdminPanel`, `DetailedAnalytics`)

#### 🟢 AdminContext useEffect Deadlock Düzeltildi
- Tek büyük `useEffect` iki ayrı effect'e bölündü:
  1. Business/Branch/Role yükleme
  2. Bildirim ve Escalated count (businessId sonrası)

#### 🟢 Auth Modal Düzeltmeleri
- Mobilde "Hesap Oluştur" butonu artık kaydırılabilir alanda görünür
- `React.memo` ile gereksiz render'lar azaltıldı

#### 🟢 Logout Loading State
- Çıkış işlemi sırasında `PageLoader` gösteriliyor (boş ekran önlendi)
- `loading: true` → `signOut` → 1500ms bekleme → `loading: false`

#### 🟢 KPI Delta Düzeltmesi
- Küçük baseline değerler için aşırı yüzde (`18211%` gibi) gösterimini önleyen mantık eklendi (`DetailedAnalytics`)

#### 🟢 Admin Filtreler ve Yönlendirme Düzeltmeleri
- `location.state.filter = 'urgent'` ile doğru acil filtre uygulaması
- `showUrgentOnly = true` → Diğer tüm filtreler sıfırlanır
- Acil İncele butonu → Smooth scroll to feedback list (mobil/masaüstü)

#### 🟢 QR Yönlendirici Güncellemeleri
- iOS'ta güvenli localStorage yazma (`writeToStorageAsync`)
- Manager QR okuttuğunda oturum temizlenerek Landing'e yönlendirme
- Kayıtlı müşteri QR okuttuğunda `customer_qr_scans` upsert + `/customer-panel` yönlendirme

#### 🟢 Müşteri Paneli
- Şube seçimi sonrası modal kapanma ve seçim sıfırlama sorunu giderildi
- Mesafe filtresi toggle + Google Maps URL bazlı sıralama eklendi

#### 🟢 Feedback Management Optimizasyonu
- Filter click handler'ları `useCallback` ile memoize edildi
- Arama 500ms debounce
- `fetchDeep` ile server-side pagination
- Race condition (requestId ref) önlemi

#### 🟢 Modal Performans Optimizasyonu
- `AuthModal` ve `SettingsModal` `React.memo` ile sarıldı
- Pahalı stil hesaplamaları `useMemo` ile cache'lendi

#### 🟢 CSP Hataları
- `unsafe-eval` CSP meta tag kaldırıldı (`index.html`)

#### 🟢 Landing Page Refaktörü
- Büyük bölümler ayrı component dosyalarına taşındı
- `legalTexts.js` ile hukuki metinler merkezi hale getirildi
- Support e-postası: `support@vocalize.global`

#### 🟢 ActivityTooltip TypeError Düzeltmesi
- `label` undefined olduğunda `split` methodu çağrılmadan önce string kontrolü eklendi

#### 🟢 Vercel Deployment
- `vercel.json` ile SPA rewrite yapılandırması (`/* → /index.html`)
- Production build başarıyla çalışıyor

---

*Bu döküman, VocalizeSystem V1'in tam teknik referansıdır. Tüm yeni geliştirmeler bu dosyaya eklenerek güncel tutulmalıdır.*

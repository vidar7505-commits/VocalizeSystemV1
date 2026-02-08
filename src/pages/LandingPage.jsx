import React, { useState, useEffect, useRef } from 'react';
import { Helmet } from 'react-helmet';
import { Link as ScrollLink, animateScroll as scroll, scroller } from 'react-scroll';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence, useScroll, useTransform, useInView } from 'framer-motion';
import {
  Menu, X, Zap, CheckCircle2, Timer, Send, Lightbulb, Heart, QrCode, Loader2,
  ArrowRight, TrendingUp, Target, RefreshCw, Cpu, BrainCircuit, Activity, Sparkles,
  MessageSquare as MessageSquareText, Info, AlertTriangle, Layers, Zap as ZapIcon, Network,
  Instagram, Mail, Building2, Globe2, TrendingDown, Languages, MapPin, Shield, Cloud, Database,
  BarChart3, Users, Clock, Star, Award, Briefcase, Code2, Brain, Lock
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/use-toast";
import AuthModal from "@/components/AuthModal";
import InstallationRequestModal from "@/components/InstallationRequestModal";
import { Input } from "@/components/ui/input";
import { supabase } from "@/lib/customSupabaseClient";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ShaderAnimation } from "@/components/ShaderAnimation";
import { WorldMap } from "@/components/WorldMap";
import { Badge } from "@/components/ui/badge";
import { useAuth } from '@/contexts/SupabaseAuthContext';

// ============================================================================
// YASAL METİNLER (KVKK & TERMS)
// ============================================================================

const TERMS_CONTENT = `
VOCALIZE PLATFORMU KULLANIM KOŞULLARI

Bu Kullanım Koşulları, Vocalize SaaS platformunu ("Platform") kullanan tüm kişi ve kurumlar için bağlayıcıdır. Platforma kayıt olarak aşağıdaki şartları kabul etmiş sayılırsınız.

1. HİZMETİN TANIMI
Vocalize, işletmelerin müşterilerinden QR kod aracılığıyla geri bildirim (şikayet, öneri, değerlendirme) toplamasına, bu verileri analiz etmesine ve yönetmesine olanak tanıyan bulut tabanlı bir yazılım hizmetidir.

2. KULLANICI KATEGORİLERİ
- Yönetici (İşletme): Platformu müşterilerinden geri bildirim toplamak amacıyla kullanan ticari işletmelerdir.
- Müşteri (Son Kullanıcı): İşletmelere geri bildirim bırakan gerçek kişilerdir.
- Misafir Kullanıcı: Kayıt olmadan sınırlı özelliklerle geri bildirim bırakan kullanıcılardır.

3. KULLANICI YÜKÜMLÜLÜKLERİ
- Kullanıcılar, Platformu kullanırken genel ahlaka, kamu düzenine ve yürürlükteki yasalara aykırı içerik (küfür, hakaret, tehdit, yasa dışı materyal vb.) paylaşamaz.
- İşletmeler, topladıkları müşteri verilerini KVKK ve ilgili mevzuata uygun şekilde kullanmakla yükümlüdür.
- Kullanıcı hesaplarının güvenliği kullanıcının sorumluluğundadır. Şifre paylaşımından doğacak zararlardan Vocalize sorumlu tutulamaz.

4. VERİ İŞLEME VE AI KULLANIMI
- Platform, müşteri geri bildirimlerini analiz etmek, özetlemek ve işletmelere içgörü sunmak amacıyla Yapay Zeka (AI) teknolojileri kullanır.
- Gönderilen geri bildirimler, anonimleştirilerek AI modellerinin eğitilmesi ve hizmet kalitesinin artırılması amacıyla kullanılabilir.
- Kullanıcılar, içeriklerinin bu amaçla işlenmesine izin verir.

5. TEKNİK ALTYAPI VE YURTDIŞI AKTARIM
- Vocalize, veritabanı ve sunucu hizmetleri için Supabase Inc. altyapısını kullanmaktadır.
- Verileriniz, hizmetin doğası gereği Supabase'in yurtdışında (ABD/AB) bulunan sunucularında şifreli olarak saklanmaktadır. Kayıt olarak bu veri aktarımını kabul etmiş sayılırsınız.

6. HİZMET KESİNTİLERİ VE SORUMLULUK REDDİ
- Platform "olduğu gibi" (as-is) sunulmaktadır. Vocalize, kesintisiz hizmet, %100 doğruluk veya belirli bir amaca uygunluk garantisi vermez.
- Teknik arızalar, bakım çalışmaları veya mücbir sebeplerden kaynaklanan veri kayıplarından veya hizmet kesintilerinden Vocalize sorumlu değildir.

7. ÜCRETLENDİRME VE DEĞİŞİKLİK HAKKI
- Vocalize, sunduğu paketlerin fiyatlarını ve içeriğini önceden bildirimde bulunarak değiştirme hakkını saklı tutar.
- Pilot kullanım süresi boyunca ücretsiz sunulan özellikler, daha sonra ücretli hale getirilebilir.

8. HESABIN ASKIYA ALINMASI VEYA SİLİNMESİ
- Kötüye kullanım (spam, saldırı, manipülasyon) tespit edilmesi durumunda Vocalize, kullanıcı hesabını önceden uyarı yapmaksızın askıya alma veya kalıcı olarak silme hakkına sahiptir.

9. FİKRİ MÜLKİYET
- Platformun tasarımı, yazılımı, logosu ve tüm fikri hakları Vocalize'a aittir. İzinsiz kopyalanamaz veya ticari amaçla çoğaltılamaz.

10. GELECEKTE HİZMETİN SONLANDIRILMASI
- Vocalize, ticari kararları doğrultusunda Platformu tamamen kapatma veya hizmeti sonlandırma hakkını saklı tutar. Bu durumda kullanıcılara verilerini yedeklemeleri için makul bir süre tanınacaktır.
`;

const KVKK_CONTENT = `
KVKK AYDINLATMA METNİ

Vocalize olarak kişisel verilerinizin güvenliğine önem veriyoruz. 6698 sayılı Kişisel Verilerin Korunması Kanunu ("KVKK") kapsamında, verilerinizin nasıl işlendiği aşağıda açıklanmıştır.

1. VERİ SORUMLUSU
Vocalize Platformu (İletişim: support@vocalize.app)

2. İŞLENEN KİŞİSEL VERİLER
Platforma kayıt olurken veya kullanırken aşağıdaki verileriniz işlenmektedir:
- Kimlik Bilgileri: Ad, Soyad.
- İletişim Bilgileri: E-posta adresi, Telefon numarası.
- İşlem Güvenliği: IP adresi, Log kayıtları, Cihaz bilgileri.
- Müşteri İşlem: Gönderdiğiniz geri bildirimler, şikayetler, puanlar ve yüklenen görseller.

3. VERİ İŞLEME AMAÇLARI
Kişisel verileriniz aşağıdaki amaçlarla işlenmektedir:
- Üyelik işlemlerinin gerçekleştirilmesi ve hesabın yönetilmesi.
- Müşteri geri bildirimlerinin ilgili işletmeye iletilmesi ve takibi.
- Şikayet yönetimi ve müşteri memnuniyeti süreçlerinin yürütülmesi.
- Yapay zeka destekli analizlerin yapılması (duygu analizi, özetleme).
- Yasal yükümlülüklerin yerine getirilmesi (log tutma vb.).

4. HUKUKİ SEBEP
Kişisel verileriniz, KVKK Madde 5/2 kapsamında "Bir sözleşmenin kurulması veya ifasıyla doğrudan doğruya ilgili olması" ve "Veri sorumlusunun meşru menfaatleri için veri işlenmesinin zorunlu olması" hukuki sebeplerine dayalı olarak işlenmektedir.

5. YURTDIŞI VERİ AKTARIMI
Platformun teknik altyapısı global bulut sağlayıcıları üzerinde çalışmaktadır.
| Hizmet Sağlayıcı | Ülke | Amaç |
|------------------|------|------|
| Supabase Inc.    | ABD  | Veritabanı ve Kimlik Doğrulama |
| OpenAI / LLM     | ABD  | Yapay Zeka Analizi (İçerik Verisi) |

Açık rızanız doğrultusunda verileriniz, hizmetin sağlanabilmesi için bu sunuculara aktarılmaktadır.

6. SAKLAMA VE SİLME
Kişisel verileriniz, üyeliğiniz devam ettiği sürece veya yasal saklama süreleri boyunca muhafaza edilir. Üyeliğinizi sildiğinizde veya talep etmeniz durumunda, yasal zorunluluklar hariç olmak üzere verileriniz silinir veya anonim hale getirilir.

7. İLGİLİ KİŞİNİN HAKLARI
KVKK Madde 11 uyarınca; verilerinizin işlenip işlenmediğini öğrenme, işlenmişse bilgi talep etme, işlenme amacını öğrenme, eksik/yanlış işlenmişse düzeltilmesini isteme ve silinmesini talep etme haklarına sahipsiniz. Taleplerinizi uygulama üzerinden veya e-posta yoluyla iletebilirsiniz.
`;

// ============================================================================
// ÇOK DİLLİ İÇERİK
// ============================================================================

const content = {
  tr: {
    nav: {
      features: 'Neden Vocalize?',
      useCases: 'Kimler Kullanıyor?',
      pricing: 'Fiyatlandırma',
      v2: 'V2/AI',
      login: 'Giriş Yap',
      install: 'Kurulum İçin Başvur',
      managerLogin: 'Yönetici Girişi',
      globalVision: 'Global Vizyonumuz'
    },
    hero: {
      badge: 'HORECA Sektörüne Özel Geri Bildirim Sistemi',
      title1: 'Kayıp Müşterileri Yakalayın,',
      title2: 'Şikayetleri',
      title2Highlight: 'Kazanca Dönüştürün.',
      subtitle1: 'Her müşteri geri bildirimi size anında ulaşsın;',
      subtitle2: 'Şikayetleri büyümeden çözüp, itibarınızı tek panelden yönetin.',
      ctaPrimary: 'Kurulum İçin Başvur',
      ctaSecondary: 'Yönetici Girişi',
      badge1: '5 Dakikada Kurulum',
      badge2: 'İlk Aylık Ödeme 30 Gün Sonra',
      countries: {
        usa: 'ABD',
        uk: 'Birleşik Krallık',
        france: 'Fransa',
        germany: 'Almanya',
        uae: 'BAE',
        turkey: 'Türkiye',
        russia: 'Rusya'
      }
    },
    infrastructure: {
      title: 'Teknoloji Ortaklarımız',
      subtitle: 'Dünya standartlarında teknoloji altyapısı'
    },
    technologies: {
      title: 'Güçlü Altyapı',
      subtitle: 'Enterprise-grade teknoloji & platform ortaklıkları',
      items: [
        { name: 'OpenAI', logo: 'openai', logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/4/4d/OpenAI_Logo.svg', color: 'bg-slate-700 text-white', brandColor: '#000000' },
        { name: 'Gemini', logo: 'gcloud', logoUrl: 'https://www.gstatic.com/lamda/images/gemini_sparkle_v002_d473530437e2925461ad5.svg', color: 'bg-blue-600 text-white', brandColor: '#4285F4' },
        { name: 'Anthropic', logo: 'anthropic', logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/b/b3/Anthropic_logo.svg', color: 'bg-slate-700 text-white', brandColor: '#0f172a' },
        { name: 'Supabase', logo: 'supabase', logoUrl: 'https://www.vectorlogo.zone/logos/supabase/supabase-ar21.svg', color: 'bg-green-600 text-white', brandColor: '#3ECF8E' },
        { name: 'AWS', logo: 'aws', logoUrl: 'https://www.vectorlogo.zone/logos/amazon_aws/amazon_aws-ar21.svg', color: 'bg-orange-600 text-white', brandColor: '#FF9900' },
        { name: 'Stripe', logo: 'stripe', logoUrl: 'https://www.vectorlogo.zone/logos/stripe/stripe-ar21.svg', color: 'bg-purple-600 text-white', brandColor: '#635BFF' },
        { name: 'Google Cloud', logo: 'gcloud2', logoUrl: 'https://www.vectorlogo.zone/logos/google_cloud/google_cloud-ar21.svg', color: 'bg-blue-600 text-white', brandColor: '#4285F4' }
      ]
    },
    industries: {
      title: 'Sektörel Çözüm Alanlarımız',
      subtitle: 'Hangi endüstride olursanız olun, biz işletmenize özel zeka sunuyoruz.',
      solutions: [
        {
          icon: '🥐',
          title: 'Kafe & Restoran',
          subtitle: 'Hizmet Kalitesi & Personel Verimlilik',
          desc: 'Gerçek zamanlı müşteri geri bildirimleriyle personel performansını analiz edin, menü optimizasyonu yapın.'
        },
        {
          icon: '🏪',
          title: 'Franchise & Perakende',
          subtitle: 'Merkezi Denetim & Standart Koruma',
          desc: 'Yüzlerce şubede operasyonel tutarlılığı sağlayın, bölgesel performans karşılaştırmasını merkez panelde yapın.'
        },
        {
          icon: '🏨',
          title: 'Otel & Konaklama',
          subtitle: 'Misafir Deneyim Yolculuğu',
          desc: 'Check-in\' den checkout\'a her dokunuş noktasında müşteri memnuniyetini izleyin, online itibarınızı proaktif yönetin.'
        },
        {
          icon: '🏥',
          title: 'Sağlık & Klinik',
          subtitle: 'Hasta Memnuniyeti & Operasyonel KPI',
          desc: 'Hasta deneyimini ölçün, ekip koordinasyonunu iyileştirin, sağlık hizmetinde standartları yükseltin.'
        },
        {
          icon: '🍰',
          title: 'Fırın & Pastane',
          subtitle: 'Ürün Kalitesi & Müşteri Beklentileri',
          desc: 'Ürün taze lik oranı, servis hızı ve ürün çeşitliliğinde müşteri memnuniyetini real-time takip edin, stok yönetimini optimize edin.'
        }
      ]
    },
    ecosystem: {
      title: 'Stratejik Ekosistem & Pilot Programlar',
      subtitle: 'İşletmenizin Operasyonel Zekasını Kurmak',
      desc: 'Sektör lideri kahve zincirleri ve global perakende grupları ile birlikte, müşteri geri bildirimini işletme zekasına dönüştürme vizyonumuzu kurguluyoruz.',
      cta: 'Pilot Sürece Dahil Olun',
      comingSoon: 'Yakında',
      partners: [
        { title: 'Loyalty & CRM', desc: 'Müşteri sadakat programları entegrasyonu.' },
        { title: 'Supply Chain', desc: 'Tedarik zinciri ve stok zekası.' },
        { title: 'Predictive Marketing', desc: 'Tahminlemeli pazarlama stratejileri.' }
      ]
    },
    features: {
      title: 'Neden Vocalize?',
      subtitle: 'Vocalize, işletmelerin müşterilerini sadece duymalarını değil, anlamalarını sağlar. Her mesaj, bir veri değil; bir deneyimdir.',
      feature1: {
        title: 'Anında Müdahale',
        desc: 'Şikayetleri müşteriniz kapıdan çıkmadan çözün, dijital itibarınızı proaktif olarak koruyun.'
      },
      feature2: {
        title: 'Şube Röntgeni',
        desc: 'Tüm lokasyonlarınızı ve personel performansınızı tek panelden, anlık verilerle yönetin.'
      },
      feature3: {
        title: 'Sıfır Sürtünme',
        desc: 'Uygulama indirme zorunluluğu yok. QR okutmak yeterli; geleneksel anketlere göre 12 kat daha fazla katılım.'
      }
    },
    useCases: {
      title: 'İşletmenize Özel Çözümler',
      subtitle: 'Sektörünüz ne olursa olsun, müşteri sesini Vocalize ile büyüme stratejisine dönüştürün.',
      solutions: [
        {
          sector: 'Kafe & Restaurant',
          icon: '🍽️',
          challenge: 'Yemek kalitesi ve hizmet hızı',
          solution: 'Anlık geri bildirimlerle menü optimizasyonu ve personel eğitimi'
        },
        {
          sector: 'Otel & Konaklama',
          icon: '🏨',
          challenge: 'Misafir deneyimi yönetimi',
          solution: 'Şube bazlı memnuniyet takibi ve online itibar koruması'
        },
        {
          sector: 'Perakende & Mağazacılık',
          icon: '🛍️',
          challenge: 'Müşteri sadakati ve mağaza performansı',
          solution: 'Lokasyon karşılaştırması ve trend analizi'
        },
        {
          sector: 'Zincir İşletmeler',
          icon: '🏢',
          challenge: 'Çok şubeli operasyon koordinasyonu',
          solution: 'Merkezi yönetim paneli ve bölge raporlaması'
        }
      ]
    },
    qrPoster: {
      title: 'Her İşletmeye Özel QR Afiş Tasarımı',
      desc: 'QR afişleriniz markanıza ve mekânınıza özel renklendirilebilir.',
      note: 'Renk, yazı veya dil düzenlemeleri işletmenize göre uyarlanır.',
      posterText: 'Görüşlerinizi bizimle paylaşın',
      footer: 'Afiş Tasarım Süreci Bize, Baskı İşletmenize Aittir.',
      features: [
        'Marka Renkleriyle Özelleştirme',
        'Çok Dilli Destek',
        'Profesyonel Baskıya Hazır',
        'Dijital & Fiziksel Kullanım'
      ]
    },
    pricing: {
      badge: 'HORECA Sektörüne Özel',
      title: 'İşletmenize Özel',
      titleHighlight: 'Çözüm Modelleri',
      subtitle: 'Tek lokasyonlu kafeden global franchise zincirine kadar, her işletme profili için ölçeklenebilir altyapı.',
      plan1: {
        name: 'Butik / Tek Şube',
        desc: 'Yerel işletmeler için başlangıç.',
        features: [
          'Sınırsız QR Geri Bildirim',
          'Temel Yönetici Paneli',
          'Google Harita Yönlendirmesi',
          'Haftalık E-posta Raporu'
        ],
        priceTitle: 'Şube Başı Lisans',
        priceSubtitle: 'Kurulum + Aylık Hizmet Bedeli',
        cta: 'Fiyat Bilgisi Al'
      },
      plan2: {
        name: 'Zincir İşletme',
        desc: 'Çok şubeli yapılar için.',
        badge: 'En Çok Tercih Edilen',
        features: [
          "Tüm 'Butik' Özellikleri",
          'Şube Kıyaslama Tablosu',
          'Bölge/Müdür Yetkilendirme',
          'Personel Bazlı Veri Takibi',
          'Detaylı Trend Analizi'
        ],
        priceTitle: 'Hacim İndirimi',
        priceSubtitle: 'Şube sayısına göre özel teklif',
        cta: 'Teklif İsteyin'
      },
      plan3: {
        name: 'Enterprise / Global',
        desc: 'Dev operasyonlar & Partnerlik.',
        features: [
          'V2 AI Erken Erişim Hakkı',
          'Size Özel AI Model Eğitimi',
          'Özel Entegrasyon Kurgusu (API)',
          'Özel Başarı Yöneticisi',
          'Öncelikli Teknik Destek'
        ],
        priceTitle: 'Kurumsal Plan',
        priceSubtitle: 'Proje bazlı fiyatlandırma',
        cta: 'Bize Ulaşın'
      },
      commonTitle: 'Tüm Paketlere Dahil Standart Hizmetler',
      commonFeatures: [
        'QR Afiş Tasarım Desteği',
        '7/24 Teknik İzleme',
        'Düzenli Veri Yedekleme',
        'Sınırsız Personel Hesabı'
      ]
    },
    impact: {
      title: 'Geri Bildirim Değil, İşletme Zekası.',
      subtitle: 'Vocalize, sadece geri bildirim toplamaz; işletmenizde ölçülebilir potansiyel etkinin bir parçasıdır.',
      metric1: {
        title: 'Daha Fazla Geri Bildirim',
        desc: 'Müşterilerin geri bildirim iletme oranında belirgin artış sağlar ve anlık veri akışı oluşturur.'
      },
      metric2: {
        title: 'Daha Yüksek Kazanım Oranı',
        desc: 'Olumsuz deneyimler online platformlara taşınmadan yerinde çözülür, bu sayede müşteri kayıpları azalır.'
      },
      metric3: {
        title: 'Operasyonel Verimlilik',
        desc: 'Şube performansı, ekip yanıt hızları ve müşteri memnuniyeti tek panelden yönetilir ve analiz edilir.'
      }
    },
    v2: {
      badge: 'Çok Yakında',
      title: 'İşletmenizin',
      titleHighlight: 'Akıllı Stratejik Ortağı',
      subtitle: 'Vocalize V2, sadece müşteri geri bildirimlerini toplamakla kalmayacak;',
      subtitle2: 'müşteri davranışlarını analiz edip',
      subtitle3: ', sektör trendlerini takip ederek işletmenize',
      subtitle4: 'özel stratejik öneriler',
      subtitle5: 'sunacak.',
      features: {
        f1: {
          title: 'Müşteri Portföyü Analizi',
          desc: 'Müşterilerinizin davranış biçimlerini, tercihlerini ve beklentilerini yapay zeka ile derinlemesine analiz eder.'
        },
        f2: {
          title: 'Global Trend Takibi',
          desc: 'Dünya genelindeki haberleri ve sektör trendlerini takip ederek, müşteri portföyünüze uygun fırsatları erkenden yakalar.'
        },
        f3: {
          title: 'İşletmeye Özel Öneriler',
          desc: 'Sorunları önceden tespit eder ve müşteri tercihlerinize uygun, kârlı stratejik çözümler sunar.'
        },
        f4: {
          title: 'Global Marka Algısı',
          desc: 'Markanızın dünya çapında nasıl algılandığını ölçer, rekabet avantajı elde etmeniz için size yol gösterir.'
        }
      },
      pricingTitle: 'V2 AI Ücretlendirmesi',
      pricingDesc1: 'V2 AI özellikleri, işletmenize sunacağı katma değer göz önüne alınarak',
      pricingDesc2: 'premium bir yatırım ürünü',
      pricingDesc3: 'olarak konumlandırılacaktır. Detaylı fiyatlandırma bilgileri çok yakında duyurulacak.',
      pricingPoint1: 'Franchise/Global İşletmelere Özel:',
      pricingPoint1Desc: 'V2 AI\'ya erken erişim hakkı ve öncelikli geçiş avantajı',
      pricingPoint2: 'Kişiselleştirilmiş AI Avantajı:',
      pricingPoint2Desc: 'Erken katılan işletmelerin verileri anonimleştirilerek sistem eğitiminde kullanılır. Bu sayede V2 AI, işletmenizin karakteristiklerini tanır ve size özel stratejik öneriler sunabilir - sanki sadece sizin için tasarlanmış bir AI ortağınız olur.',
      pricingPoint3: 'Veri Güvenliği:',
      pricingPoint3Desc: 'Tüm veriler KVKK standartlarında anonimleştirilir ve güvenle işlenir',
      ctaV2: 'V2 Hakkında Bilgi Alın'
    },
    footer: {
      copyright: '© 2025 Vocalize Systems — Müşteri sesini teknolojiyle buluşturuyoruz.',
      kvkk: 'KVKK Aydınlatma Metni',
      terms: 'Kullanım Koşulları'
    },
    leadModal: {
      title: 'Bilgi Alın',
      subtitle: 'Aşağıdaki formu doldurun, ekibimiz sizinle iletişime geçsin.',
      quickOptions: [
        'Fiyatlandırmayı öğrenmek istiyorum',
        'Demo toplantısı yapmak istiyorum',
        'Vocalize\'ın çalışma mantığını öğrenmek istiyorum',
        'İşletmem için uygun mu değerlendirmek istiyorum'
      ],
      nameLabel: 'Ad Soyad',
      namePlaceholder: 'John Doe',
      emailLabel: 'E-posta',
      emailPlaceholder: 'ornek@sirket.com',
      phoneLabel: 'Telefon (İsteğe bağlı)',
      phonePlaceholder: '+90 555 ...',
      messageLabel: 'Mesajınız',
      messagePlaceholder: 'Sorunuzu buraya yazın...',
      submit: 'Gönder'
    }
  },
  en: {
    nav: {
      features: 'Why Vocalize?',
      useCases: 'Who Uses It?',
      pricing: 'Pricing',
      v2: 'V2/AI',
      login: 'Login',
      install: 'Apply for Installation',
      managerLogin: 'Manager Login',
      globalVision: 'Global Vision'
    },
    hero: {
      badge: 'Feedback System for HORECA Sector',
      title1: 'Capture Lost Customers,',
      title2: 'Turn Complaints into',
      title2Highlight: 'Revenue.',
      subtitle1: 'Let every customer feedback reach you instantly;',
      subtitle2: 'Resolve complaints before they escalate, manage your reputation from a single panel.',
      ctaPrimary: 'Apply for Installation',
      ctaSecondary: 'Manager Login',
      badge1: '5-Minute Setup',
      badge2: 'First Monthly Payment After 30 Days',
      countries: {
        usa: 'USA',
        uk: 'United Kingdom',
        france: 'France',
        germany: 'Germany',
        uae: 'UAE',
        turkey: 'Turkey',
        russia: 'Russia'
      }
    },
    infrastructure: {
      title: 'Technology Partners',
      subtitle: 'World-class technology infrastructure'
    },
    technologies: {
      title: 'Enterprise-Grade Infrastructure',
      subtitle: 'Leading technology & platform partnerships',
      items: [
        { name: 'OpenAI', logo: 'openai', logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/4/4d/OpenAI_Logo.svg', color: 'bg-white text-black', brandColor: '#000000' },
        { name: 'Supabase', logo: 'supabase', logoUrl: 'https://www.vectorlogo.zone/logos/supabase/supabase-ar21.svg', color: 'bg-green-600 text-white', brandColor: '#3ECF8E' },
        { name: 'Google Cloud', logo: 'gcloud', logoUrl: 'https://www.vectorlogo.zone/logos/google_cloud/google_cloud-ar21.svg', color: 'bg-blue-600 text-white', brandColor: '#4285F4' },
        { name: 'AWS', logo: 'aws', logoUrl: 'https://www.vectorlogo.zone/logos/amazon_aws/amazon_aws-ar21.svg', color: 'bg-orange-600 text-white', brandColor: '#FF9900' },
        { name: 'Stripe', logo: 'stripe', logoUrl: 'https://www.vectorlogo.zone/logos/stripe/stripe-ar21.svg', color: 'bg-purple-600 text-white', brandColor: '#635BFF' },
        { name: 'PostgreSQL', logo: 'postgres', logoUrl: 'https://www.vectorlogo.zone/logos/postgresql/postgresql-ar21.svg', color: 'bg-blue-700 text-white', brandColor: '#336791' }
      ]
    },
    industries: {
      title: 'Industry-Specific Solutions',
      subtitle: 'Whatever your industry, we provide intelligence tailored to your business.',
      solutions: [
        {
          icon: '🥐',
          title: 'Coffee & Restaurants',
          subtitle: 'Service Quality & Staff Productivity',
          desc: 'Analyze staff performance with real-time customer feedback, optimize menus based on data.'
        },
        {
          icon: '🏪',
          title: 'Franchise & Retail',
          subtitle: 'Centralized Control & Standard Protection',
          desc: 'Ensure operational consistency across hundreds of branches, run regional performance comparisons from the central dashboard.'
        },
        {
          icon: '🏨',
          title: 'Hotels & Hospitality',
          subtitle: 'Guest Experience Journey',
          desc: 'Monitor customer satisfaction at every touchpoint from check-in to check-out, proactively manage your online reputation.'
        },
        {
          icon: '🏥',
          title: 'Healthcare & Clinics',
          subtitle: 'Patient Satisfaction & Operational KPIs',
          desc: 'Measure patient experience, improve team coordination, raise standards in healthcare service.'
        },
        {
          icon: '🍰',
          title: 'Bakery & Pastry',
          subtitle: 'Product Quality & Customer Expectations',
          desc: 'Track customer satisfaction on product freshness, service speed and variety in real-time, optimize inventory management.'
        }
      ]
    },
    ecosystem: {
      title: 'Strategic Ecosystem & Pilot Programs',
      subtitle: 'Building Your Business Operational Intelligence',
      desc: 'We\'re shaping our customer feedback-to-business-intelligence vision together with industry-leading coffee chains and global retail groups.',
      cta: 'Join Our Pilot Program',
      comingSoon: 'Coming Soon',
      partners: [
        { title: 'Loyalty & CRM', desc: 'Customer loyalty program integration.' },
        { title: 'Supply Chain', desc: 'Supply chain & inventory intelligence.' },
        { title: 'Predictive Marketing', desc: 'Predictive marketing strategies.' }
      ]
    },
    features: {
      title: 'Why Vocalize?',
      subtitle: 'Vocalize enables businesses not just to hear, but to understand their customers. Every message is an experience, not just data.',
      feature1: {
        title: 'Instant Intervention',
        desc: 'Resolve complaints before customers leave, proactively protect your digital reputation.'
      },
      feature2: {
        title: 'Branch X-Ray',
        desc: 'Manage all your locations and staff performance from a single panel with real-time data.'
      },
      feature3: {
        title: 'Zero Friction',
        desc: 'No app download required. Just scan QR; 12x more engagement than traditional surveys.'
      }
    },
    useCases: {
      title: 'Tailored Solutions for Your Business',
      subtitle: 'Whatever your sector, turn customer voice into growth strategy with Vocalize.',
      solutions: [
        {
          sector: 'Cafe & Restaurant',
          icon: '🍽️',
          challenge: 'Food quality and service speed',
          solution: 'Menu optimization and staff training with real-time feedback'
        },
        {
          sector: 'Hotel & Hospitality',
          icon: '🏨',
          challenge: 'Guest experience management',
          solution: 'Branch-based satisfaction tracking and online reputation protection'
        },
        {
          sector: 'Retail & Shopping',
          icon: '🛍️',
          challenge: 'Customer loyalty and store performance',
          solution: 'Location comparison and trend analysis'
        },
        {
          sector: 'Chain Businesses',
          icon: '🏢',
          challenge: 'Multi-branch operation coordination',
          solution: 'Central management panel and regional reporting'
        }
      ]
    },
    qrPoster: {
      title: 'Custom QR Poster Design for Every Business',
      desc: 'Your QR posters can be customized to match your brand and venue.',
      note: 'Color, text, or language adjustments are adapted to your business.',
      posterText: 'Share your thoughts with us',
      footer: 'Design Process is Ours, Printing is Yours.',
      features: [
        'Brand Color Customization',
        'Multi-Language Support',
        'Print-Ready Professional Quality',
        'Digital & Physical Use'
      ]
    },
    pricing: {
      badge: 'For HORECA Sector',
      title: 'Custom',
      titleHighlight: 'Solution Models',
      subtitle: 'Scalable infrastructure for every business profile, from single-location cafes to global franchise chains.',
      plan1: {
        name: 'Boutique / Single Branch',
        desc: 'Starting point for local businesses.',
        features: [
          'Unlimited QR Feedback',
          'Basic Admin Panel',
          'Google Maps Redirect',
          'Weekly Email Reports'
        ],
        priceTitle: 'Per-Branch License',
        priceSubtitle: 'Setup + Monthly Service Fee',
        cta: 'Get Pricing Info'
      },
      plan2: {
        name: 'Chain Business',
        desc: 'For multi-branch structures.',
        badge: 'Most Popular',
        features: [
          "All 'Boutique' Features",
          'Branch Comparison Dashboard',
          'Regional/Manager Authorization',
          'Staff-Based Data Tracking',
          'Detailed Trend Analysis'
        ],
        priceTitle: 'Volume Discount',
        priceSubtitle: 'Custom quote based on branch count',
        cta: 'Request Quote'
      },
      plan3: {
        name: 'Enterprise / Global',
        desc: 'For large operations & partnerships.',
        features: [
          'V2 AI Early Access',
          'Custom AI Model Training',
          'Custom Integration Setup (API)',
          'Dedicated Success Manager',
          'Priority Technical Support'
        ],
        priceTitle: 'Enterprise Plan',
        priceSubtitle: 'Project-based pricing',
        cta: 'Contact Us'
      },
      commonTitle: 'Standard Services Included in All Packages',
      commonFeatures: [
        'QR Poster Design Support',
        '24/7 Technical Monitoring',
        'Regular Data Backup',
        'Unlimited Staff Accounts'
      ]
    },
    impact: {
      title: 'Not Feedback, Business Intelligence.',
      subtitle: 'Vocalize doesn\'t just collect feedback; it\'s part of measurable potential impact on your business.',
      metric1: {
        title: 'More Feedback',
        desc: 'Significant increase in customer feedback submission rates and creates real-time data flow.'
      },
      metric2: {
        title: 'Higher Retention Rate',
        desc: 'Negative experiences are resolved on-site before moving to online platforms, reducing customer loss.'
      },
      metric3: {
        title: 'Operational Efficiency',
        desc: 'Branch performance, team response times, and customer satisfaction managed and analyzed from a single panel.'
      }
    },
    v2: {
      badge: 'Coming Very Soon',
      title: 'Your Business\'s',
      titleHighlight: 'Intelligent Strategic Partner',
      subtitle: 'Vocalize V2 won\'t just collect customer feedback;',
      subtitle2: 'it will analyze customer behavior',
      subtitle3: ', track industry trends, and provide',
      subtitle4: 'strategic recommendations',
      subtitle5: 'tailored to your business.',
      features: {
        f1: {
          title: 'Customer Portfolio Analysis',
          desc: 'Deeply analyzes your customers\' behavior patterns, preferences, and expectations with AI.'
        },
        f2: {
          title: 'Global Trend Tracking',
          desc: 'Tracks global news and industry trends, capturing opportunities suited to your customer portfolio early.'
        },
        f3: {
          title: 'Business-Specific Recommendations',
          desc: 'Detects issues in advance and offers profitable strategic solutions aligned with your customer preferences.'
        },
        f4: {
          title: 'Global Brand Perception',
          desc: 'Measures how your brand is perceived globally, guiding you to gain competitive advantage.'
        }
      },
      pricingTitle: 'V2 AI Pricing',
      pricingDesc1: 'V2 AI features will be positioned as a',
      pricingDesc2: 'premium investment product',
      pricingDesc3: 'considering the added value it brings to your business. Detailed pricing will be announced soon.',
      pricingPoint1: 'For Franchise/Global Businesses:',
      pricingPoint1Desc: 'Early access to V2 AI and priority transition advantage',
      pricingPoint2: 'Personalized AI Advantage:',
      pricingPoint2Desc: 'Data from early-adopting businesses is anonymized and used in system training. This way, V2 AI learns your business characteristics and offers tailored strategic recommendations - as if you have an AI partner designed exclusively for you.',
      pricingPoint3: 'Data Security:',
      pricingPoint3Desc: 'All data is anonymized and processed securely under GDPR standards',
      ctaV2: 'Get Info About V2'
    },
    footer: {
      copyright: '© 2025 Vocalize Systems — Connecting customer voice with technology.',
      kvkk: 'Privacy Policy',
      terms: 'Terms of Service'
    },
    leadModal: {
      title: 'Get Information',
      subtitle: 'Fill out the form below, our team will contact you.',
      quickOptions: [
        'I want to learn about pricing',
        'I want to schedule a demo meeting',
        'I want to learn how Vocalize works',
        'I want to evaluate if it\'s suitable for my business'
      ],
      nameLabel: 'Full Name',
      namePlaceholder: 'John Doe',
      emailLabel: 'Email',
      emailPlaceholder: 'example@company.com',
      phoneLabel: 'Phone (Optional)',
      phonePlaceholder: '+1 555 ...',
      messageLabel: 'Your Message',
      messagePlaceholder: 'Write your question here...',
      submit: 'Submit'
    }
  }
};

// ============================================================================
// ENTERPRISE BACKGROUND COMPONENT
// ============================================================================

const EnterpriseBackground = () => {
  return (
    <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `
            linear-gradient(to right, #14b8a6 1px, transparent 1px),
            linear-gradient(to bottom, #14b8a6 1px, transparent 1px)
          `,
          backgroundSize: '80px 80px'
        }}
      />

      <div
        className="absolute top-0 left-0 w-[600px] h-[600px] opacity-20"
        style={{
          background: 'radial-gradient(circle, rgba(20,184,166,0.4) 0%, rgba(20,184,166,0.1) 40%, transparent 70%)',
          filter: 'blur(80px)'
        }}
      />

      <div
        className="absolute top-0 right-0 w-[500px] h-[500px] opacity-15"
        style={{
          background: 'radial-gradient(circle, rgba(249,115,22,0.3) 0%, rgba(249,115,22,0.1) 40%, transparent 70%)',
          filter: 'blur(70px)'
        }}
      />

      <div
        className="absolute bottom-0 left-1/4 w-[400px] h-[400px] opacity-10"
        style={{
          background: 'radial-gradient(circle, rgba(20,184,166,0.3) 0%, transparent 70%)',
          filter: 'blur(60px)'
        }}
      />

      <div
        className="absolute bottom-0 right-0 w-[500px] h-[500px] opacity-15"
        style={{
          background: 'radial-gradient(circle, rgba(249,115,22,0.25) 0%, transparent 70%)',
          filter: 'blur(70px)'
        }}
      />
    </div>
  );
};

// ============================================================================
// ANIMATED COUNTER COMPONENT
// ============================================================================

const AnimatedCounter = ({ from = 0, to, duration = 2, suffix = "" }) => {
  const nodeRef = useRef();
  const inView = useInView(nodeRef, { once: true, margin: "-100px" });

  useEffect(() => {
    const node = nodeRef.current;
    if (!inView) return;

    let startTime;
    const step = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / (duration * 1000), 1);
      const ease = 1 - Math.pow(1 - progress, 4);
      const current = Math.floor(from + (to - from) * ease);

      if (node) {
        node.textContent = current.toLocaleString() + suffix;
      }

      if (progress < 1) {
        window.requestAnimationFrame(step);
      }
    };

    window.requestAnimationFrame(step);
  }, [inView, from, to, duration, suffix]);

  return <span ref={nodeRef} className="tabular-nums">{from}{suffix}</span>;
};

// ============================================================================
// FADE IN ANIMATION COMPONENT
// ============================================================================

const FadeIn = ({ children, delay = 0, className }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.6, delay, ease: "easeOut" }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

// ============================================================================
// **DASHBOARD MOCKUP COMPONENT (Detaylı Analiz Temalı)**
// ============================================================================

// ============================================================================
// **DASHBOARD MOCKUP COMPONENT (Detaylı Analiz Temalı)**
// ============================================================================

const DashboardMockup = ({ lang }) => {
  const [selectedBranch, setSelectedBranch] = useState('istanbul');
  const [activeTab, setActiveTab] = useState('analytics'); // 'analytics', 'feedback', 'performance'
  const [selectedFeedback, setSelectedFeedback] = useState(null);


  // Demo data for different branches
  const branchData = {
    istanbul: {
      name: lang === 'tr' ? 'İstanbul Merkez' : 'Istanbul Main',
      totalReports: 127,
      loyaltyScore: 73,
      resolution: 72,
      pending: 34,
      brandPerception: 74,
      serviceExperience: 81,
      trendData: [45, 52, 48, 65, 71, 58, 62, 79, 68, 55, 72, 68, 74, 81, 76, 69, 72, 78, 82, 85],
      color: 'teal'
    },
    ankara: {
      name: lang === 'tr' ? 'Ankara Şubesi' : 'Ankara Branch',
      totalReports: 89,
      loyaltyScore: 68,
      resolution: 65,
      pending: 28,
      brandPerception: 69,
      serviceExperience: 75,
      trendData: [42, 48, 45, 58, 62, 54, 59, 71, 65, 52, 66, 62, 68, 75, 70, 64, 68, 72, 76, 79],
      color: 'orange'
    },
    izmir: {
      name: lang === 'tr' ? 'İzmir Şubesi' : 'Izmir Branch',
      totalReports: 156,
      loyaltyScore: 81,
      resolution: 85,
      pending: 12,
      brandPerception: 82,
      serviceExperience: 88,
      trendData: [58, 65, 62, 78, 84, 72, 79, 92, 86, 75, 89, 85, 91, 96, 92, 87, 91, 95, 98, 99],
      color: 'green'
    }
  };

  const branch = branchData[selectedBranch];
  const colorClasses = {
    teal: { bg: 'bg-teal-500/5', border: 'border-teal-500/20', text: 'text-teal-400', icon: 'text-teal-400', hover: 'hover:border-teal-500/40' },
    orange: { bg: 'bg-orange-500/5', border: 'border-orange-500/20', text: 'text-orange-400', icon: 'text-orange-400', hover: 'hover:border-orange-500/40' },
    green: { bg: 'bg-green-500/5', border: 'border-green-500/20', text: 'text-green-400', icon: 'text-green-400', hover: 'hover:border-green-500/40' }
  };

  // Feedback Tab Data - Demo feedback items for HORECA sector
  const feedbackMessages = [
    {
      id: 1,
      type: lang === 'tr' ? 'Şikayet' : 'Complaint',
      author: 'Müşteri A. / Customer A.',
      rating: 2,
      status: lang === 'tr' ? 'Çözümde' : 'In Progress',
      date: lang === 'tr' ? '2 saat önce' : '2 hours ago',
      title: lang === 'tr' ? 'Yavaş Servis' : 'Slow Service',
      message: lang === 'tr' ? 'Akşam saatlerinde personel yetersiz. Ana yemeği alana kadar 45 dakika bekledik.' : 'Evening service was understaffed. We waited 45 minutes for the main course.',
      color: 'red'
    },
    {
      id: 2,
      type: lang === 'tr' ? 'Öneri' : 'Suggestion',
      author: 'Müşteri B. / Customer B.',
      rating: 4,
      status: lang === 'tr' ? 'Beklemede' : 'Pending',
      date: lang === 'tr' ? '4 saat önce' : '4 hours ago',
      title: lang === 'tr' ? 'Menü Çeşitliliği' : 'Menu Variety',
      message: lang === 'tr' ? 'Vegan seçenekler eklenirse çok iyi olur. Arkadaşları da gelmek istiyor ama seçenekleri kısıtlı.' : 'Would be great to have more vegan options. Friends want to join but options are limited.',
      color: 'blue'
    },
    {
      id: 3,
      type: lang === 'tr' ? 'Değerlendirme' : 'Evaluation',
      author: 'Müşteri C. / Customer C.',
      rating: 5,
      status: lang === 'tr' ? 'Sonuçlandı' : 'Resolved',
      date: lang === 'tr' ? 'Dün' : 'Yesterday',
      title: lang === 'tr' ? 'Mükemmel Deneyim' : 'Excellent Experience',
      message: lang === 'tr' ? 'Samimi ortam, lezzetli yemekler ve çok ilgili personel. Sonrasında daha da iyiye gidebilir derseniz, tatlı seçenekleri biraz daha fazla olabilir.' : 'Warm atmosphere, delicious food and attentive staff. Overall excellent, though dessert options could be expanded.',
      color: 'green'
    }
  ];

  // Performance League Data
  const performanceLeague = [
    {
      id: 'istanbul',
      name: lang === 'tr' ? 'İstanbul Merkez' : 'Istanbul Main',
      rank: 1,
      score: 92,
      trend: 'up',
      performance: lang === 'tr' ? 'Mükemmel' : 'Excellent',
      scorecard: lang === 'tr' ? '✓ Müşteri Memnuniyeti: 94%\n✓ Personel Performansı: 90%\n✓ Hizmet Hızı: 88%\n✓ Ürün Kalitesi: 95%' : '✓ Customer Satisfaction: 94%\n✓ Staff Performance: 90%\n✓ Service Speed: 88%\n✓ Product Quality: 95%'
    },
    {
      id: 'ankara',
      name: lang === 'tr' ? 'Ankara Şubesi' : 'Ankara Branch',
      rank: 3,
      score: 68,
      trend: 'down',
      performance: lang === 'tr' ? 'DüşükAlarm' : 'Needs Attention',
      scorecard: lang === 'tr' ? '⚠ Müşteri Memnuniyeti: 65%\n⚠ Personel Performansı: 62%\n✓ Hizmet Hızı: 79%\n⚠ Ürün Kalitesi: 68%' : '⚠ Customer Satisfaction: 65%\n⚠ Staff Performance: 62%\n✓ Service Speed: 79%\n⚠ Product Quality: 68%'
    },
    {
      id: 'izmir',
      name: lang === 'tr' ? 'İzmir Şubesi' : 'Izmir Branch',
      rank: 2,
      score: 85,
      trend: 'up',
      performance: lang === 'tr' ? 'İyi' : 'Good',
      scorecard: lang === 'tr' ? '✓ Müşteri Memnuniyeti: 88%\n✓ Personel Performansı: 82%\n✓ Hizmet Hızı: 85%\n✓ Ürün Kalitesi: 87%' : '✓ Customer Satisfaction: 88%\n✓ Staff Performance: 82%\n✓ Service Speed: 85%\n✓ Product Quality: 87%'
    }
  ];

  const colors = colorClasses[branch.color];

  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3, duration: 0.8 }}
      className="relative mt-16 max-w-6xl mx-auto"
    >
      {/* Mockup Container with enhanced 3D effect */}
      <div className="relative transform perspective-1200 hover:scale-[1.01] transition-all duration-700">
        <div
          className="bg-gradient-to-br from-slate-800/95 via-slate-850/95 to-slate-900/95 backdrop-blur-2xl border border-slate-700/60 rounded-3xl shadow-2xl p-4 md:p-8 transform"
          style={{
            boxShadow: '0 30px 60px -15px rgba(0, 0, 0, 0.6), 0 0 80px rgba(20, 184, 166, 0.2), inset 0 1px 0 rgba(255,255,255,0.1)'
          }}
        >
          {/* Browser-style Header */}
          <div className="flex items-center gap-2 mb-6">
            <div className="flex gap-2">
              <div className="w-3.5 h-3.5 rounded-full bg-red-500"></div>
              <div className="w-3.5 h-3.5 rounded-full bg-yellow-500"></div>
              <div className="w-3.5 h-3.5 rounded-full bg-green-500"></div>
            </div>
            <div className="ml-6 flex-1 flex items-center gap-2 bg-slate-900/60 rounded-lg px-4 py-2 border border-slate-700/50">
              <Shield className="w-4 h-4 text-green-400" />
              <span className="text-slate-400 text-xs font-medium">vocalize.global/analytics</span>
            </div>
          </div>

          {/* Branch Selector */}
          <div className="mb-6 flex items-center gap-3 flex-wrap">
            <span className="text-sm font-medium text-slate-400">
              {lang === 'tr' ? 'Şube:' : 'Branch:'}
            </span>
            <div className="flex gap-2 flex-wrap">
              {Object.entries(branchData).map(([key, data]) => {
                const getButtonClasses = () => {
                  if (selectedBranch === key) {
                    if (data.color === 'teal') return 'bg-teal-500/20 text-teal-400 border border-teal-500/40';
                    if (data.color === 'orange') return 'bg-orange-500/20 text-orange-400 border border-orange-500/40';
                    if (data.color === 'green') return 'bg-green-500/20 text-green-400 border border-green-500/40';
                  }
                  return 'bg-slate-800/40 text-slate-400 border border-slate-700/30 hover:border-slate-600/50';
                };

                return (
                  <motion.button
                    key={key}
                    onClick={() => setSelectedBranch(key)}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${getButtonClasses()}`}
                  >
                    {data.name.split(' ')[0]}
                  </motion.button>
                );
              })}
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="mb-6 flex gap-2 border-b border-slate-700/50 overflow-x-auto pb-1">
            {[
              { id: 'analytics', label: lang === 'tr' ? 'Analitikler' : 'Analytics', icon: '📊' },
              { id: 'feedback', label: lang === 'tr' ? 'Geri Bildirimler' : 'Feedback', icon: '💬' },
              { id: 'performance', label: lang === 'tr' ? 'Performans Ligi' : 'Performance', icon: '🏆' }
            ].map(tab => (
              <motion.button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-3 flex items-center gap-2 text-sm font-medium border-b-2 transition-all ${activeTab === tab.id
                  ? 'border-teal-500 text-teal-400'
                  : 'border-transparent text-slate-400 hover:text-slate-300'
                  }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </motion.button>
            ))}
          </div>
          {/* Dashboard Content */}
          <div className="space-y-6">
            {activeTab === 'analytics' && (
              <div className="space-y-6">
                {/* Top Stats Grid - İyileştirilmiş */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  {[
                    {
                      label: lang === 'tr' ? 'Toplam Bildirim' : 'Total Reports',
                      value: `${branch.totalReports}`,
                      change: '+8%',
                      icon: MessageSquareText,
                      color: 'teal',
                      trend: 'up',
                      data: branch.totalReports
                    },
                    {
                      label: lang === 'tr' ? 'Sadakat Skoru' : 'Loyalty Score',
                      value: `${branch.loyaltyScore}/100`,
                      change: '+5%',
                      icon: Heart,
                      color: 'rose',
                      trend: 'up',
                      data: branch.loyaltyScore
                    },
                    {
                      label: lang === 'tr' ? 'Çözüm Başarısı' : 'Resolution Rate',
                      value: `${branch.resolution}%`,
                      change: '+12%',
                      icon: Target,
                      color: 'green',
                      trend: 'up',
                      data: branch.resolution
                    },
                    {
                      label: lang === 'tr' ? 'Bekleyen Şikayet' : 'Pending Issues',
                      value: `${branch.pending}`,
                      change: '-15%',
                      icon: AlertTriangle,
                      color: 'orange',
                      trend: 'down',
                      data: branch.pending
                    }
                  ].map((stat, idx) => (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.4 + idx * 0.1 }}
                      className={cn(
                        "relative overflow-hidden rounded-xl p-4 border transition-all duration-300 group cursor-default",
                        `bg-${stat.color}-500/5 border-${stat.color}-500/20 hover:border-${stat.color}-500/40`
                      )}
                    >
                      {/* Animated Background Gradient */}
                      <div className={cn(
                        "absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500",
                        `bg-gradient-to-br from-${stat.color}-500/10 to-transparent`
                      )} />

                      <div className="relative z-10">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-slate-400 text-xs font-medium uppercase tracking-wider">
                            {stat.label}
                          </span>
                          <div className={cn(
                            "w-8 h-8 rounded-lg flex items-center justify-center transition-all",
                            `bg-${stat.color}-500/20 group-hover:bg-${stat.color}-500/30`
                          )}>
                            <stat.icon className={cn("w-4 h-4", `text-${stat.color}-400`)} />
                          </div>
                        </div>
                        <div className={cn("text-3xl font-bold mb-1", `text-${stat.color}-400`)}>
                          {stat.value}
                        </div>
                        <div className="flex items-center gap-1.5">
                          {stat.trend === 'up' ? (
                            <TrendingUp className="w-3.5 h-3.5 text-green-400" />
                          ) : (
                            <TrendingDown className="w-3.5 h-3.5 text-red-400" />
                          )}
                          <span className={cn(
                            "text-xs font-semibold",
                            stat.trend === 'up' ? 'text-green-400' : 'text-red-400'
                          )}>
                            {stat.change}
                          </span>
                          <span className="text-xs text-slate-500 ml-1">
                            {lang === 'tr' ? 'geçen döneme göre' : 'vs last period'}
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>

                {/* Analytics Grid - İyileştirilmiş */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Trend Chart */}
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.6 }}
                    className="bg-slate-900/60 rounded-xl p-6 border border-slate-700/40 hover:border-teal-500/30 transition-all duration-300"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h4 className="text-white font-semibold text-sm mb-1">
                          {lang === 'tr' ? 'Bildirim Trendi' : 'Report Trend'}
                        </h4>
                        <p className="text-slate-500 text-xs">
                          {lang === 'tr' ? 'Son 30 gün' : 'Last 30 days'}
                        </p>
                      </div>
                      <BarChart3 className="w-5 h-5 text-teal-400" />
                    </div>

                    {/* Simplified Trend Chart */}
                    <div className="relative h-32 flex items-end gap-1.5">
                      {branch.trendData.map((value, i) => {
                        const height = value;
                        return (
                          <motion.div
                            key={i}
                            initial={{ height: 0 }}
                            animate={{ height: `${height}%` }}
                            transition={{ delay: 0.7 + i * 0.02, duration: 0.4 }}
                            className="flex-1 bg-gradient-to-t from-teal-500/60 to-teal-400/80 rounded-t-sm hover:from-teal-500 hover:to-teal-400 transition-all cursor-pointer"
                            title={`${value}%`}
                          />
                        );
                      })}
                    </div>
                  </motion.div>

                  {/* Marka vs Deneyim Dağılımı */}
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.7 }}
                    className="bg-slate-900/60 rounded-xl p-6 border border-slate-700/40 hover:border-orange-500/30 transition-all duration-300"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h4 className="text-white font-semibold text-sm mb-1">
                          {lang === 'tr' ? 'Marka vs Deneyim' : 'Brand vs Experience'}
                        </h4>
                        <p className="text-slate-500 text-xs">
                          {lang === 'tr' ? 'Müşteri algısı dağılımı' : 'Customer perception breakdown'}
                        </p>
                      </div>
                      <Activity className="w-5 h-5 text-orange-400" />
                    </div>

                    <div className="space-y-3">
                      <div>
                        <div className="flex items-center justify-between mb-2 text-xs">
                          <span className="text-slate-400 font-medium">
                            {lang === 'tr' ? 'Genel Algı (Marka)' : 'Brand Perception'}
                          </span>
                          <span className="text-orange-400 font-bold">{branch.brandPerception}%</span>
                        </div>
                        <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${branch.brandPerception}%` }}
                            transition={{ delay: 0.8, duration: 0.8 }}
                            className="h-full bg-gradient-to-r from-orange-500 to-orange-400 rounded-full"
                          />
                        </div>
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-2 text-xs">
                          <span className="text-slate-400 font-medium">
                            {lang === 'tr' ? 'Anlık Deneyim (Hizmet)' : 'Service Experience'}
                          </span>
                          <span className="text-blue-400 font-bold">{branch.serviceExperience}%</span>
                        </div>
                        <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${branch.serviceExperience}%` }}
                            transition={{ delay: 0.9, duration: 0.8 }}
                            className="h-full bg-gradient-to-r from-blue-500 to-blue-400 rounded-full"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Insight Note */}
                    <div className="mt-4 flex items-start gap-2 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                      <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                      <p className="text-green-300/90 text-xs leading-relaxed">
                        {lang === 'tr'
                          ? 'Hizmet deneyimi marka algısının üzerinde - müşteri memnuniyeti yüksek!'
                          : 'Service experience exceeds brand perception - high customer satisfaction!'
                        }
                      </p>
                    </div>
                  </motion.div>
                </div>

                {/* Recent Activities - İyileştirilmiş */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.8 }}
                  className="bg-slate-900/40 rounded-xl p-6 border border-slate-700/30"
                >
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-white font-semibold text-sm">
                      {lang === 'tr' ? 'Son Aktiviteler' : 'Recent Activities'}
                    </h4>
                    <Clock className="w-4 h-4 text-slate-500" />
                  </div>

                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.9 + i * 0.1 }}
                        className="flex items-center gap-3 p-3 bg-slate-800/40 rounded-lg border border-slate-700/30 hover:border-teal-500/30 hover:bg-slate-800/60 transition-all cursor-pointer group"
                      >
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-teal-500/20 to-orange-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                          <Activity className="w-5 h-5 text-teal-400" />
                        </div>
                        <div className="flex-1">
                          <div className="h-2.5 bg-slate-700/60 rounded w-3/4 mb-2 group-hover:bg-slate-700 transition-colors"></div>
                          <div className="h-2 bg-slate-700/40 rounded w-1/2 group-hover:bg-slate-700/60 transition-colors"></div>
                        </div>
                        <div className="text-xs text-slate-500 font-medium">
                          {i * 5}m
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              </div>
            )}

            {/* FEEDBACK TAB */}
            {activeTab === 'feedback' && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="space-y-4"
              >
                {feedbackMessages.map((feedback, idx) => (
                  <motion.div
                    key={feedback.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    onClick={() => setSelectedFeedback(feedback)}
                    className={cn(
                      'p-4 rounded-lg border cursor-pointer transition-all group hover:scale-[1.02]',
                      feedback.color === 'red' && `bg-red-500/10 border-red-500/30 hover:border-red-500/50`,
                      feedback.color === 'blue' && `bg-blue-500/10 border-blue-500/30 hover:border-blue-500/50`,
                      feedback.color === 'green' && `bg-green-500/10 border-green-500/30 hover:border-green-500/50`
                    )}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-3 flex-1">
                        <div className={cn(
                          'w-3 h-3 rounded-full flex-shrink-0',
                          feedback.color === 'red' && 'bg-red-500',
                          feedback.color === 'blue' && 'bg-blue-500',
                          feedback.color === 'green' && 'bg-green-500'
                        )} />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className={cn(
                              'text-xs font-bold',
                              feedback.color === 'red' && 'text-red-400',
                              feedback.color === 'blue' && 'text-blue-400',
                              feedback.color === 'green' && 'text-green-400'
                            )}>
                              {feedback.type}
                            </span>
                            <div className="flex gap-1">
                              {[...Array(5)].map((_, i) => (
                                <Star
                                  key={i}
                                  className={cn(
                                    'w-3 h-3',
                                    i < feedback.rating ? 'fill-yellow-400 text-yellow-400' : 'text-slate-600'
                                  )}
                                />
                              ))}
                            </div>
                          </div>
                          <p className="text-white font-semibold text-sm mt-1">{feedback.title}</p>
                          <p className="text-slate-400 text-xs mt-1">{feedback.author}</p>
                        </div>
                      </div>
                      <div className="text-right ml-4">
                        <span className={cn(
                          'text-xs font-medium px-2 py-1 rounded',
                          feedback.status.includes('Çözüm') || feedback.status.includes('Progress') ? 'bg-amber-500/20 text-amber-300' :
                            feedback.status.includes('Beklemede') || feedback.status.includes('Pending') ? 'bg-blue-500/20 text-blue-300' :
                              'bg-green-500/20 text-green-300'
                        )}>
                          {feedback.status}
                        </span>
                      </div>
                    </div>
                    <p className="text-slate-400 text-sm mb-2">{feedback.message.substring(0, 100)}...</p>
                    <p className="text-slate-500 text-xs">{feedback.date}</p>
                  </motion.div>
                ))}
              </motion.div>
            )}

            {/* PERFORMANCE LEAGUE TAB */}
            {activeTab === 'performance' && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="space-y-3"
              >
                {performanceLeague.sort((a, b) => a.rank - b.rank).map((branch, idx) => (
                  <motion.div
                    key={branch.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    onClick={() => setSelectedFeedback({ ...branch, isScorecard: true })}
                    className={cn(
                      'p-4 rounded-lg border cursor-pointer transition-all group hover:scale-[1.02]',
                      branch.rank === 1 && 'bg-amber-500/10 border-amber-500/30 hover:border-amber-500/50',
                      branch.rank === 2 && 'bg-slate-500/10 border-slate-500/30 hover:border-slate-500/50',
                      branch.rank === 3 && 'bg-red-500/10 border-red-500/30 hover:border-red-500/50'
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 flex-1">
                        <div className={cn(
                          'w-10 h-10 rounded-lg flex items-center justify-center font-bold text-lg',
                          branch.rank === 1 && 'bg-amber-500/20 text-amber-400',
                          branch.rank === 2 && 'bg-slate-500/20 text-slate-300',
                          branch.rank === 3 && 'bg-red-500/20 text-red-400'
                        )}>
                          #{branch.rank}
                        </div>
                        <div className="flex-1">
                          <p className="text-white font-semibold">{branch.name}</p>
                          <p className={cn(
                            'text-xs mt-1',
                            branch.performance.includes('Mükemmel') || branch.performance.includes('Excellent') ? 'text-green-400' :
                              branch.performance.includes('İyi') || branch.performance.includes('Good') ? 'text-blue-400' :
                                'text-red-400'
                          )}>
                            {branch.performance}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-white">{branch.score}</div>
                        <div className="flex items-center gap-1 justify-end mt-1">
                          {branch.trend === 'up' ?
                            <TrendingUp className="w-4 h-4 text-green-400" /> :
                            <TrendingDown className="w-4 h-4 text-red-400" />
                          }
                          <span className="text-xs font-semibold text-slate-400">/ 100</span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </div>

          {/* Feedback/Performance Detail Modal */}
          <AnimatePresence>
            {selectedFeedback && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setSelectedFeedback(null)}
                className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
              >
                <motion.div
                  initial={{ scale: 0.95, y: 20 }}
                  animate={{ scale: 1, y: 0 }}
                  exit={{ scale: 0.95, y: 20 }}
                  onClick={(e) => e.stopPropagation()}
                  className="bg-slate-800 border border-slate-700 rounded-2xl p-6 md:p-8 max-w-2xl w-full max-h-[80vh] overflow-y-auto"
                >
                  {selectedFeedback.isScorecard ? (
                    <div>
                      <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-4">
                          <div className={cn('w-12 h-12 rounded-lg flex items-center justify-center font-bold text-xl', selectedFeedback.rank === 1 && 'bg-amber-500/20 text-amber-400', selectedFeedback.rank === 2 && 'bg-slate-500/20 text-slate-300', selectedFeedback.rank === 3 && 'bg-red-500/20 text-red-400')}>
                            #{selectedFeedback.rank}
                          </div>
                          <div>
                            <h3 className="text-2xl font-bold text-white">{selectedFeedback.name}</h3>
                            <p className={cn('text-sm mt-1', selectedFeedback.performance.includes('Mükemmel') ? 'text-green-400' : selectedFeedback.performance.includes('İyi') ? 'text-blue-400' : 'text-red-400')}>
                              {selectedFeedback.performance}
                            </p>
                          </div>
                        </div>
                        <button onClick={() => setSelectedFeedback(null)} className="text-slate-400 hover:text-white text-2xl">×</button>
                      </div>
                      <div className="space-y-4">
                        <div className="bg-slate-900/50 rounded-lg p-4">
                          <h4 className="text-white font-semibold mb-4">{lang === 'tr' ? 'Performans Karnesi' : 'Performance Card'}</h4>
                          <div className="whitespace-pre-line text-slate-300 text-sm font-medium leading-relaxed">{selectedFeedback.scorecard}</div>
                        </div>
                        <div className="flex items-center gap-4 p-4 bg-slate-900/50 rounded-lg">
                          <div className="text-4xl font-bold text-white">{selectedFeedback.score}</div>
                          <div>
                            <p className="text-slate-400 text-sm">{lang === 'tr' ? 'Toplam Puan' : 'Total Score'}</p>
                            <div className="flex items-center gap-2 mt-2">
                              {selectedFeedback.trend === 'up' ? <TrendingUp className="w-4 h-4 text-green-400" /> : <TrendingDown className="w-4 h-4 text-red-400" />}
                              <span className={selectedFeedback.trend === 'up' ? 'text-green-400 font-semibold' : 'text-red-400 font-semibold'}>
                                {selectedFeedback.trend === 'up' ? lang === 'tr' ? 'Yükseliş Trendi' : 'Upward Trend' : lang === 'tr' ? 'Düşüş Trendi' : 'Downward Trend'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="flex items-start justify-between mb-6">
                        <div>
                          <div className="flex items-center gap-3 mb-3">
                            <span className={cn('text-sm font-bold px-3 py-1 rounded', selectedFeedback.color === 'red' && 'bg-red-500/20 text-red-400', selectedFeedback.color === 'blue' && 'bg-blue-500/20 text-blue-400', selectedFeedback.color === 'green' && 'bg-green-500/20 text-green-400')}>
                              {selectedFeedback.type}
                            </span>
                            <div className="flex gap-0.5">
                              {[...Array(5)].map((_, i) => (
                                <Star key={i} className={cn('w-4 h-4', i < selectedFeedback.rating ? 'fill-yellow-400 text-yellow-400' : 'text-slate-600')} />
                              ))}
                            </div>
                          </div>
                          <h3 className="text-2xl font-bold text-white mb-2">{selectedFeedback.title}</h3>
                          <p className="text-slate-400 text-sm">{selectedFeedback.author}</p>
                        </div>
                        <button onClick={() => setSelectedFeedback(null)} className="text-slate-400 hover:text-white text-2xl">×</button>
                      </div>
                      <div className="space-y-4">
                        <div className="bg-slate-900/50 rounded-lg p-4">
                          <p className="text-slate-300 text-sm leading-relaxed">{selectedFeedback.message}</p>
                        </div>
                        <div className="flex items-center justify-between p-4 bg-slate-900/50 rounded-lg">
                          <div>
                            <p className="text-slate-400 text-xs uppercase tracking-wide">{lang === 'tr' ? 'Durum' : 'Status'}</p>
                            <p className={cn('text-sm font-bold mt-1', selectedFeedback.status.includes('Çözüm') || selectedFeedback.status.includes('Progress') ? 'text-amber-400' : selectedFeedback.status.includes('Beklemede') || selectedFeedback.status.includes('Pending') ? 'text-blue-400' : 'text-green-400')}>
                              {selectedFeedback.status}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-slate-400 text-xs uppercase tracking-wide">{lang === 'tr' ? 'Tarih' : 'Date'}</p>
                            <p className="text-sm text-slate-300 mt-1">{selectedFeedback.date}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Enhanced Glow Effect */}
          <div
            className="absolute -inset-6 bg-gradient-to-r from-teal-500/15 via-orange-500/10 to-teal-500/15 rounded-3xl blur-3xl -z-10 opacity-60 animate-pulse"
            style={{
              animationDuration: '4s'
            }}
          />
        </div>
      </div>
    </motion.div>
  );
};

// ============================================================================
// **YENİ: USE CASES INTERACTIVE CARDS**
// ============================================================================

const UseCaseCard = ({ solution, index, lang }) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.15, duration: 0.5 }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      className="relative group"
    >
      {/* Card Container */}
      <div className="relative bg-gradient-to-br from-slate-800/60 via-slate-850/60 to-slate-900/60 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-8 h-full hover:border-teal-500/40 transition-all duration-500 overflow-hidden">
        {/* Animated Background Gradient */}
        <motion.div
          className="absolute inset-0 bg-gradient-to-br from-teal-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"
          animate={isHovered ? { scale: 1.1 } : { scale: 1 }}
        />

        {/* Content */}
        <div className="relative z-10">
          {/* Icon & Title */}
          <div className="flex items-start gap-4 mb-6">
            <motion.div
              className="text-5xl"
              animate={isHovered ? { scale: 1.2, rotate: 10 } : { scale: 1, rotate: 0 }}
              transition={{ duration: 0.3 }}
            >
              {solution.icon}
            </motion.div>
            <div className="flex-1">
              <h3 className="text-2xl font-bold text-white mb-2 tracking-tight">
                {solution.sector}
              </h3>
            </div>
          </div>

          {/* Challenge */}
          <div className="mb-4 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-4 h-4 text-red-400" />
              <span className="text-xs font-semibold text-red-300 uppercase tracking-wider">
                {lang === 'tr' ? 'Yaygın Sorun' : 'Common Challenge'}
              </span>
            </div>
            <p className="text-sm text-red-200/80 leading-relaxed">
              {solution.challenge}
            </p>
          </div>

          {/* Solution */}
          <div className="p-4 bg-teal-500/10 border border-teal-500/20 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Lightbulb className="w-4 h-4 text-teal-400" />
              <span className="text-xs font-semibold text-teal-300 uppercase tracking-wider">
                {lang === 'tr' ? 'Vocalize Çözümü' : 'Vocalize Solution'}
              </span>
            </div>
            <p className="text-sm text-teal-200/90 leading-relaxed font-medium">
              {solution.solution}
            </p>
          </div>

          {/* CTA Arrow */}
          <motion.div
            className="flex items-center gap-2 mt-6 text-teal-400 font-semibold text-sm cursor-pointer group-hover:gap-3 transition-all"
            animate={isHovered ? { x: 5 } : { x: 0 }}
          >
            <span>{lang === 'tr' ? 'Detaylı İncele' : 'Learn More'}</span>
            <ArrowRight className="w-4 h-4" />
          </motion.div>
        </div>

        {/* Hover Border Glow */}
        <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
          style={{
            boxShadow: '0 0 30px rgba(20, 184, 166, 0.3)'
          }}
        />
      </div>
    </motion.div>
  );
};

// ============================================================================
// ============================================================================
// MAIN LANDING PAGE COMPONENT - PART 1 
// ============================================================================

const LandingPage = () => {
  const [lang, setLang] = useState('tr');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [installModalOpen, setInstallModalOpen] = useState(false);
  const [selectedSector, setSelectedSector] = useState('');
  const [authDefaultTab, setAuthDefaultTab] = useState('login');
  const [authDefaultRole, setAuthDefaultRole] = useState('customer');
  const [legalModal, setLegalModal] = useState({ isOpen: false, type: '' });
  const [leadModalOpen, setLeadModalOpen] = useState(false);
  const [leadType, setLeadType] = useState('info_request');
  const [leadLoading, setLeadLoading] = useState(false);
  const [leadForm, setLeadForm] = useState({
    name: '',
    email: '',
    phone: '',
    message: ''
  });
  const [isInitializing, setIsInitializing] = useState(true);

  const { toast } = useToast();
  const { loginAsGuest } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const t = content[lang];

  // Scroll handler
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Initialization check
  useEffect(() => {
    const checkTimer = setTimeout(() => {
      const bid = searchParams.get('businessId') || searchParams.get('bid');
      console.log("URL Kontrolü Tamamlandı. Business ID:", bid);
      setIsInitializing(false);
    }, 800);

    return () => clearTimeout(checkTimer);
  }, [searchParams]);

  // OpenAuth param handler
  useEffect(() => {
    const openAuth = searchParams.get('openAuth');
    if (openAuth === 'true') {
      setAuthDefaultTab('register');
      setAuthDefaultRole('customer');
      setIsAuthModalOpen(true);

      const newParams = new URLSearchParams(searchParams);
      newParams.delete('openAuth');
      navigate(`?${newParams.toString()}`, { replace: true });
    }
  }, [searchParams, navigate]);

  // Navigation functions
  const scrollToTop = () => scroll.scrollToTop();

  const scrollToPricing = () => {
    scroller.scrollTo('pricing', {
      duration: 800,
      delay: 0,
      smooth: 'easeInOutQuart',
      offset: -50
    });
  };

  const openLogin = () => {
    setAuthDefaultTab('login');
    setAuthDefaultRole('customer');
    setIsAuthModalOpen(true);
  };

  const openRegister = () => {
    setAuthDefaultTab('register');
    setAuthDefaultRole('customer');
    setIsAuthModalOpen(true);
  };

  const openManagerLogin = () => {
    setAuthDefaultTab('login');
    setAuthDefaultRole('manager');
    setIsAuthModalOpen(true);
  };

  const openInstallModal = (sector = '') => {
    setSelectedSector(sector);
    setInstallModalOpen(true);
  };

  const handleGuestContinue = () => {
    setIsAuthModalOpen(false);
    loginAsGuest();
    localStorage.setItem('vocalize_guest_mode', 'true');
    toast({
      title: lang === 'tr' ? "Misafir Modu" : "Guest Mode",
      description: lang === 'tr' ? "Geri bildirim göndermek için işletme seçin." : "Select a business to send feedback."
    });
    setTimeout(() => {
      navigate('/customer-panel?guest=true');
    }, 500);
  };

  const handleLegalLinkClick = (type) => setLegalModal({ isOpen: true, type });

  // Lead modal functions
  const openLeadModal = (type) => {
    setLeadType(type);
    setLeadForm({ name: '', email: '', phone: '', message: '' });
    setLeadModalOpen(true);
  };

  const handleQuickOption = (option) => {
    setLeadForm(prev => ({ ...prev, message: option }));
  };

  const handleLeadSubmit = async (e) => {
    e.preventDefault();

    if (!leadForm.name || !leadForm.email || !leadForm.message) {
      toast({
        title: lang === 'tr' ? "Hata" : "Error",
        description: lang === 'tr' ? "Lütfen gerekli alanları doldurun." : "Please fill required fields.",
        variant: "destructive"
      });
      return;
    }

    setLeadLoading(true);
    try {
      const { error } = await supabase.from('vocalize_leads').insert({
        name: leadForm.name,
        email: leadForm.email,
        phone: leadForm.phone || null,
        company_name: null,
        sector: null,
        message: leadForm.message,
        lead_type: leadType,
        lead_score: 10,
        source: 'landing_page'
      });

      if (error) throw error;

      toast({
        title: lang === 'tr' ? "Teşekkür ederiz!" : "Thank you!",
        description: lang === 'tr'
          ? "Ekibimiz en kısa sürede sizinle iletişime geçecek."
          : "Our team will contact you soon."
      });

      setLeadModalOpen(false);
      setLeadForm({ name: '', email: '', phone: '', message: '' });
    } catch (error) {
      console.error('Lead submit error:', error);
      toast({
        title: lang === 'tr' ? "Hata" : "Error",
        description: lang === 'tr'
          ? "Bir sorun oluştu, lütfen tekrar deneyin."
          : "Something went wrong, please try again.",
        variant: "destructive"
      });
    } finally {
      setLeadLoading(false);
    }
  };

  const navLinks = [
    { name: t.nav.features, to: 'features' },
    { name: t.nav.useCases, to: 'industries' },
    { name: t.nav.pricing, to: 'pricing' },
    { name: t.nav.v2, to: 'v2-vision' },
    { name: t.nav.globalVision, to: 'global-map' }
  ];

  if (isInitializing) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#0f172a]">
        <Loader2 className="w-12 h-12 text-teal-500 animate-spin mb-4" />
        <p className="text-slate-400 text-sm font-medium animate-pulse">
          {lang === 'tr' ? 'İşletme verileri doğrulanıyor...' : 'Verifying business data...'}
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-100 font-sans w-full overflow-x-hidden relative selection:bg-teal-500/30">
      <Helmet>
        <title>
          {lang === 'tr'
            ? 'Vocalize - HORECA Sektörü İçin Müşteri Geri Bildirim Sistemi'
            : 'Vocalize - Customer Feedback System for HORECA Sector'}
        </title>
        <meta
          name="description"
          content={lang === 'tr'
            ? "Kayıp müşterileri yakalayın, şikayetleri kazanca dönüştürün. HORECA sektörüne özel geri bildirim çözümü."
            : "Capture lost customers, turn complaints into revenue. Feedback solution for HORECA sector."}
        />
      </Helmet>

      <EnterpriseBackground />

      {/* ===== HEADER ===== */}
      <header className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-300 border-b border-transparent will-change-transform",
        scrolled
          ? "bg-[#0f172a]/95 backdrop-blur-xl border-slate-800/80 shadow-lg"
          : "bg-transparent"
      )}>
        <div className="container mx-auto px-4 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer relative" onClick={scrollToTop}>
            <div className="w-14 h-14 flex items-center justify-center relative z-20">
              <img
                src="faviconbeyaz.png"
                alt="Vocalize Logo"
                className="h-14 w-auto object-contain brightness-110"
              />
            </div>
            <div className="relative h-12 w-[140px] overflow-hidden">
              <motion.span
                className="absolute left-0 top-0 h-full flex items-center font-bold text-2xl md:text-3xl tracking-tight whitespace-nowrap text-white"
                initial={{ x: 0, opacity: 1 }}
                animate={{
                  x: scrolled ? -50 : 0,
                  opacity: scrolled ? 0 : 1
                }}
                transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
              >
                VOCALIZE
              </motion.span>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-6">
            {navLinks.map((link) => (
              <ScrollLink
                key={link.name}
                to={link.to}
                spy={true}
                smooth={true}
                offset={-80}
                duration={500}
                className="text-sm font-medium text-slate-300 hover:text-white cursor-pointer transition-colors tracking-tight"
              >
                {link.name}
              </ScrollLink>
            ))}
          </nav>

          <div className="hidden md:flex items-center gap-8 text-sm font-medium">
            <button
              onClick={() => setLang(lang === 'tr' ? 'en' : 'tr')}
              className="flex items-center gap-1.5 text-slate-400 hover:text-white transition-colors group"
            >
              <Languages className="w-4 h-4" />
              <span className="font-semibold text-xs uppercase tracking-wide">
                {lang === 'tr' ? 'EN' : 'TR'}
              </span>
            </button>

            <button onClick={openLogin} className="text-slate-300 hover:text-white transition-colors hidden sm:inline-block">
              {t.nav.login}
            </button>

            <Button
              onClick={openInstallModal}
              className="bg-teal-500 hover:bg-teal-600 text-white border-none font-semibold px-5"
            >
              {t.nav.install}
            </Button>
          </div>

          <button
            className="md:hidden p-2 text-white"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? <X /> : <Menu />}
          </button>
        </div>

        {/* Mobile Menu */}
        <AnimatePresence>
          {isMenuOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="md:hidden bg-[#0f172a]/98 backdrop-blur-xl border-b border-slate-800 overflow-hidden"
            >
              <div className="container mx-auto px-4 py-4 flex flex-col gap-4">
                {navLinks.map((link) => (
                  <ScrollLink
                    key={link.name}
                    to={link.to}
                    spy={true}
                    smooth={true}
                    offset={-80}
                    duration={500}
                    onClick={() => setIsMenuOpen(false)}
                    className="text-lg font-medium py-2 border-b border-slate-800 text-slate-300 hover:text-white transition-colors"
                  >
                    {link.name}
                  </ScrollLink>
                ))}

                <button
                  onClick={() => {
                    setLang(lang === 'tr' ? 'en' : 'tr');
                    setIsMenuOpen(false);
                  }}
                  className="flex items-center gap-2 text-slate-300 hover:text-white transition-colors py-2"
                >
                  <Languages className="w-5 h-5" />
                  <span className="font-semibold">
                    {lang === 'tr' ? 'Switch to English' : 'Türkçe\'ye Geç'}
                  </span>
                </button>

                <div className="flex flex-col gap-3 mt-4">
                  <Button
                    className="w-full bg-slate-700 text-white hover:bg-slate-600 border-none"
                    onClick={() => {
                      setIsMenuOpen(false);
                      openLogin();
                    }}
                  >
                    {t.nav.login}
                  </Button>
                  <Button
                    className="w-full bg-teal-500 text-white hover:bg-teal-600 font-semibold"
                    onClick={() => {
                      setIsMenuOpen(false);
                      openInstallModal();
                    }}
                  >
                    {t.nav.install}
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* ===== HERO SECTION ===== */}
      <section className="relative w-full min-h-[100svh] flex items-center justify-center pt-20 overflow-hidden z-10">
        {/* Shader Animation Background - Mobile: Start at text (top-20), Desktop: Full (top-0) */}
        {/* Shader Animation Background - Mobile: Full top coverage (inset-0), Desktop: Full */}
        <ShaderAnimation className="absolute inset-0 w-full h-full z-0" />

        {/* Dark overlay for text readability */}
        <div className="absolute inset-0 bg-black/40 z-10" />

        {/* Hero Content */}
        <div className="container mx-auto px-4 relative z-20 text-center flex flex-col items-center justify-center h-full">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="max-w-6xl mx-auto px-4 w-full"
          >
            {/* Badge */}
            <motion.div
              className="inline-flex items-center gap-2 bg-teal-500/10 border border-teal-500/30 text-teal-400 px-3 md:px-4 py-1 md:py-1.5 rounded-full text-xs md:text-sm font-semibold mb-8 md:mb-12 backdrop-blur-sm mt-20 md:mt-16"
              whileHover={{ scale: 1.05 }}
              animate={{
                boxShadow: [
                  "0 0 0 0px rgba(20, 184, 166, 0)",
                  "0 0 0 4px rgba(20, 184, 166, 0.2)",
                  "0 0 0 0px rgba(20, 184, 166, 0)"
                ]
              }}
              transition={{
                boxShadow: {
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut"
                }
              }}
            >
              <Sparkles className="w-3 h-3 md:w-4 md:h-4 fill-current flex-shrink-0" />
              {t.hero.badge}
            </motion.div>

            {/* Main Title */}
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-white mb-8 tracking-tight leading-[1.15] px-4 flex flex-col items-center md:block [text-shadow:_0_2px_10px_rgba(0,0,0,0.8)]">
              <span className="block">{t.hero.title1}</span>
              <span className="block mt-2 md:mt-4 text-center md:text-left">
                {t.hero.title2} <span className="text-teal-400 whitespace-nowrap">{t.hero.title2Highlight}</span>
              </span>
            </h1>

            {/* Subtitle */}
            <p className="text-base sm:text-lg md:text-xl text-slate-200 mb-12 max-w-4xl mx-auto font-medium leading-[1.6] px-6 opacity-90 [text-shadow:_0_1px_8px_rgba(0,0,0,0.6)]">
              <span className="block md:inline font-semibold text-white/95">{t.hero.subtitle1}</span>
              <span className="block md:inline md:ml-1 mt-3 md:mt-0">{t.hero.subtitle2}</span>
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12 w-full px-6 sm:px-0">
              <Button
                size="lg"
                className="h-14 px-8 w-full sm:w-auto bg-slate-100 hover:bg-white text-slate-900 font-bold text-base transition-all shadow-lg hover:shadow-xl"
                onClick={openInstallModal}
              >
                {t.hero.ctaPrimary}
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="h-14 px-8 w-full sm:w-auto bg-transparent border-white/80 text-white hover:bg-slate-700 hover:text-white font-semibold text-base transition-all"
                onClick={openManagerLogin}
              >
                {t.hero.ctaSecondary}
              </Button>
            </div>

            {/* Feature Badges */}
            <div className="flex flex-wrap items-center justify-center gap-6 text-xs font-bold text-slate-200 uppercase tracking-widest opacity-90">
              <div className="flex items-center gap-2 bg-slate-900/50 border border-slate-100/10 px-4 py-2 rounded-full shadow-md backdrop-blur-sm mx-1">
                <Zap className="w-3.5 h-3.5 text-orange-400 fill-current" />
                <span>{t.hero.badge1}</span>
              </div>
              <div className="flex items-center gap-2 bg-slate-900/50 border border-slate-100/10 px-4 py-2 rounded-full shadow-md backdrop-blur-sm mx-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />
                <span>{t.hero.badge2}</span>
              </div>
            </div>

            {/* ===== YENİ DASHBOARD MOCKUP ===== */}
            <DashboardMockup lang={lang} />
          </motion.div>
        </div>
      </section>



      {/* ===== INFRASTRUCTURE SECTION ===== */}
      <section className="py-16 md:py-20 bg-gradient-to-r from-slate-950/50 via-slate-900/50 to-slate-950/50 border-y border-slate-800 relative z-10 overflow-hidden">
        <div className="container mx-auto px-4 mb-12">
          <div className="text-center">
            <h2 className="text-2xl md:text-4xl font-bold mb-2 md:mb-3 text-white tracking-tight">
              {lang === 'tr' ? 'Güçlü Altyapı' : 'Enterprise-Grade Infrastructure'}
            </h2>
            <p className="text-slate-400 text-base md:text-lg">
              {lang === 'tr'
                ? 'Dünya standartlarında teknoloji, sınırsız ölçeklenebilirlik ve maksimum güvenlik'
                : 'World-class technology with unlimited scalability and maximum security'}
            </p>
          </div>
        </div>

        {/* Infinite Marquee Infrastructure Cards */}
        <div className="overflow-hidden">
          <motion.div
            className="flex gap-4 md:gap-6 px-4"
            animate={{ x: [0, -2000] }}
            transition={{
              x: { repeat: Infinity, repeatType: "loop", duration: 50, ease: "linear" }
            }}
          >
            {[
              {
                icon: Code2,
                title: lang === 'tr' ? 'Node.js & Java' : 'Node.js & Java',
                desc: lang === 'tr'
                  ? 'Lider backend teknolojileri'
                  : 'Industry-leading backend',
                color: 'bg-slate-800/60 border-blue-500/30'
              },
              {
                icon: Database,
                title: lang === 'tr' ? 'PostgreSQL & Redis' : 'PostgreSQL & Redis',
                desc: lang === 'tr'
                  ? 'Veri güvenliği & hız'
                  : 'Security & speed',
                color: 'bg-slate-800/60 border-green-500/30'
              },
              {
                icon: Brain,
                title: lang === 'tr' ? 'AI & LLM' : 'AI & LLM',
                desc: lang === 'tr'
                  ? 'OpenAI, Anthropic, Gemini'
                  : 'Advanced AI integration',
                color: 'bg-slate-800/60 border-purple-500/30'
              },
              {
                icon: Cloud,
                title: lang === 'tr' ? 'Cloud Native' : 'Cloud Native',
                desc: lang === 'tr'
                  ? 'AWS & Google Cloud'
                  : 'AWS & GCP scalability',
                color: 'bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border-orange-500/30'
              }
            ].map((item, idx) => {
              const Icon = item.icon;
              return (
                <motion.div
                  key={idx}
                  whileHover={{ scale: 1.05, y: -2 }}
                  className={cn(
                    "flex flex-col items-center justify-center rounded-lg p-4 md:p-5 transition-all duration-300 cursor-default group border flex-shrink-0 w-56 md:w-64",
                    item.color,
                    "hover:border-teal-500/50 hover:shadow-lg hover:shadow-slate-800/50"
                  )}
                >
                  <div className="w-10 h-10 md:w-12 md:h-12 flex items-center justify-center mb-2 md:mb-3 rounded-lg bg-slate-700/50 group-hover:bg-teal-500/10 transition-colors">
                    <Icon className="w-5 h-5 md:w-6 md:h-6 text-teal-400 group-hover:text-teal-300 transition-colors" />
                  </div>
                  <h3 className="text-sm md:text-base font-bold text-white text-center mb-1">
                    {item.title}
                  </h3>
                  <p className="text-xs md:text-sm text-slate-400 text-center leading-tight">
                    {item.desc}
                  </p>
                </motion.div>
              );
            })}
            {/* Repeat for seamless loop (Clone 1) */}
            {[
              {
                icon: Code2,
                title: lang === 'tr' ? 'Node.js & Java' : 'Node.js & Java',
                desc: lang === 'tr'
                  ? 'Lider backend teknolojileri'
                  : 'Industry-leading backend',
                color: 'bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border-blue-500/30'
              },
              {
                icon: Database,
                title: lang === 'tr' ? 'PostgreSQL & Redis' : 'PostgreSQL & Redis',
                desc: lang === 'tr'
                  ? 'Veri güvenliği & hız'
                  : 'Security & speed',
                color: 'bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border-green-500/30'
              },
              {
                icon: Brain,
                title: lang === 'tr' ? 'AI & LLM' : 'AI & LLM',
                desc: lang === 'tr'
                  ? 'OpenAI, Anthropic, Gemini'
                  : 'Advanced AI integration',
                color: 'bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border-purple-500/30'
              },
              {
                icon: Cloud,
                title: lang === 'tr' ? 'Cloud Native' : 'Cloud Native',
                desc: lang === 'tr'
                  ? 'AWS & Google Cloud'
                  : 'AWS & GCP scalability',
                color: 'bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border-orange-500/30'
              }
            ].map((item, idx) => {
              const Icon = item.icon;
              return (
                <motion.div
                  key={`repeat-1-${idx}`}
                  whileHover={{ scale: 1.05, y: -2 }}
                  className={cn(
                    "flex flex-col items-center justify-center rounded-lg p-4 md:p-5 transition-all duration-300 cursor-default group border flex-shrink-0 w-56 md:w-64",
                    item.color,
                    "hover:border-teal-500/50 hover:shadow-lg hover:shadow-slate-800/50"
                  )}
                >
                  <div className="w-10 h-10 md:w-12 md:h-12 flex items-center justify-center mb-2 md:mb-3 rounded-lg bg-slate-700/50 group-hover:bg-teal-500/10 transition-colors">
                    <Icon className="w-5 h-5 md:w-6 md:h-6 text-teal-400 group-hover:text-teal-300 transition-colors" />
                  </div>
                  <h3 className="text-sm md:text-base font-bold text-white text-center mb-1">
                    {item.title}
                  </h3>
                  <p className="text-xs md:text-sm text-slate-400 text-center leading-tight">
                    {item.desc}
                  </p>
                </motion.div>
              );
            })}
            {/* Repeat for seamless loop (Clone 2) */}
            {[
              {
                icon: Code2,
                title: lang === 'tr' ? 'Node.js & Java' : 'Node.js & Java',
                desc: lang === 'tr'
                  ? 'Lider backend teknolojileri'
                  : 'Industry-leading backend',
                color: 'bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border-blue-500/30'
              },
              {
                icon: Database,
                title: lang === 'tr' ? 'PostgreSQL & Redis' : 'PostgreSQL & Redis',
                desc: lang === 'tr'
                  ? 'Veri güvenliği & hız'
                  : 'Security & speed',
                color: 'bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border-green-500/30'
              },
              {
                icon: Brain,
                title: lang === 'tr' ? 'AI & LLM' : 'AI & LLM',
                desc: lang === 'tr'
                  ? 'OpenAI, Anthropic, Gemini'
                  : 'Advanced AI integration',
                color: 'bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border-purple-500/30'
              },
              {
                icon: Cloud,
                title: lang === 'tr' ? 'Cloud Native' : 'Cloud Native',
                desc: lang === 'tr'
                  ? 'AWS & Google Cloud'
                  : 'AWS & GCP scalability',
                color: 'bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border-orange-500/30'
              }
            ].map((item, idx) => {
              const Icon = item.icon;
              return (
                <motion.div
                  key={`repeat-2-${idx}`}
                  whileHover={{ scale: 1.05, y: -2 }}
                  className={cn(
                    "flex flex-col items-center justify-center rounded-lg p-4 md:p-5 transition-all duration-300 cursor-default group border flex-shrink-0 w-56 md:w-64",
                    item.color,
                    "hover:border-teal-500/50 hover:shadow-lg hover:shadow-slate-800/50"
                  )}
                >
                  <div className="w-10 h-10 md:w-12 md:h-12 flex items-center justify-center mb-2 md:mb-3 rounded-lg bg-slate-700/50 group-hover:bg-teal-500/10 transition-colors">
                    <Icon className="w-5 h-5 md:w-6 md:h-6 text-teal-400 group-hover:text-teal-300 transition-colors" />
                  </div>
                  <h3 className="text-sm md:text-base font-bold text-white text-center mb-1">
                    {item.title}
                  </h3>
                  <p className="text-xs md:text-sm text-slate-400 text-center leading-tight">
                    {item.desc}
                  </p>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </section>

      {/* ===== FEATURES SECTION ===== */}
      <section id="features" className="py-12 md:py-24 bg-[#0f172a] relative z-10">
        <div className="container mx-auto px-4">
          <FadeIn className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-white tracking-tight">
              {t.features.title}
            </h2>
            <p className="text-slate-400 text-lg max-w-2xl mx-auto leading-relaxed">
              {t.features.subtitle}
            </p>
          </FadeIn>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-8">
            {[
              {
                icon: <Send className="w-6 h-6 text-teal-400" />,
                title: t.features.feature1.title,
                desc: t.features.feature1.desc
              },
              {
                icon: <Lightbulb className="w-6 h-6 text-teal-400" />,
                title: t.features.feature2.title,
                desc: t.features.feature2.desc
              },
              {
                icon: <Heart className="w-6 h-6 text-teal-400" />,
                title: t.features.feature3.title,
                desc: t.features.feature3.desc
              }
            ].map((feature, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ delay: idx * 0.2, duration: 0.5 }}
                className="bg-slate-800/50 p-8 rounded-xl border border-slate-700/50 hover:border-teal-500/30 transition-all group hover:bg-slate-800/70"
              >
                <div className="w-12 h-12 rounded-lg bg-slate-900 flex items-center justify-center mb-6 border border-slate-700 group-hover:border-teal-500/30 transition-colors">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-bold text-white mb-3 tracking-tight">
                  {feature.title}
                </h3>
                <p className="text-slate-400 text-sm leading-relaxed">
                  {feature.desc}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== INDUSTRY SOLUTIONS (Yeni - QR Poster yerine) ===== */}
      <section id="industries" className="py-24 bg-[#0f172a] relative z-10 overflow-hidden">
        <div className="container mx-auto px-4">
          <FadeIn className="text-center mb-20">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-white tracking-tight">
              {t.industries.title}
            </h2>
            <p className="text-slate-400 text-lg max-w-2xl mx-auto">
              {t.industries.subtitle}
            </p>
          </FadeIn>

          {/* Bento Grid Industries */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 md:gap-5 max-w-full mx-auto">
            {t.industries.solutions.map((industry, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1, duration: 0.5 }}
                className="group relative rounded-xl border border-slate-700/50 p-6 md:p-8 flex flex-col overflow-hidden cursor-pointer hover:border-teal-500/50 transition-all duration-300"
                whileHover={{ y: -8 }}
                onClick={() => openInstallModal(industry.title)}
              >
                {/* Activity gradient background */}
                <div className="absolute inset-0 bg-gradient-to-br from-slate-800/40 via-slate-900/60 to-slate-900 group-hover:from-slate-800/60 group-hover:via-slate-900/80 transition-all duration-300" />

                {/* Blur highlight on hover */}
                <motion.div
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                  style={{
                    background: "radial-gradient(circle at center, rgba(20,184,166,0.1) 0%, transparent 100%)",
                    filter: 'blur(40px)'
                  }}
                />

                {/* Content */}
                <div className="relative z-10">
                  {/* Icon */}
                  <div className="text-5xl mb-6 group-hover:scale-110 transition-transform duration-300 inline-block">
                    {industry.icon}
                  </div>

                  {/* Title */}
                  <h3 className="text-xl font-bold text-white mb-2 group-hover:text-teal-300 transition-colors">
                    {industry.title}
                  </h3>

                  {/* Subtitle */}
                  <p className="text-sm font-medium text-teal-400/80 mb-4">
                    {industry.subtitle}
                  </p>

                  {/* Description */}
                  <p className="text-sm text-slate-300 leading-relaxed mb-6 flex-grow">
                    {industry.desc}
                  </p>

                  {/* CTA Arrow */}
                  <motion.div
                    className="flex items-center gap-2 text-teal-400 text-sm font-semibold group-hover:gap-3 transition-all"
                    animate={{ x: 0 }}
                    whileHover={{ x: 5 }}
                  >
                    <span>{lang === 'tr' ? 'Birlikte Başlayalım' : 'Get Started'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </motion.div>
                </div>

                {/* Border glow */}
                <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
                  style={{
                    boxShadow: '0 0 30px rgba(20, 184, 166, 0.2)'
                  }}
                />
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== STRATEGIC ECOSYSTEM (Enhanced) ===== */}
      <section className="py-12 md:py-24 bg-gradient-to-b from-[#0f172a] via-slate-900/30 to-[#0f172a] relative z-10 overflow-hidden">
        <div className="container mx-auto px-4 px-2 md:px-4">
          <FadeIn>
            {/* Glassmorphism Card with Enhanced Animation */}
            <div className="max-w-3xl mx-auto relative">
              {/* Animated orbiting elements */}
              <motion.div
                className="absolute -top-20 -left-20 w-40 h-40 rounded-full border border-teal-500/20 pointer-events-none hidden md:block"
                animate={{ rotate: 360 }}
                transition={{ duration: 30, repeat: Infinity, ease: 'linear' }}
              />
              <motion.div
                className="absolute -bottom-20 -right-20 w-32 h-32 rounded-full border border-orange-500/20 pointer-events-none hidden md:block"
                animate={{ rotate: -360 }}
                transition={{ duration: 25, repeat: Infinity, ease: 'linear' }}
              />

              <div
                className="relative group rounded-2xl md:rounded-3xl p-6 md:p-14 border border-slate-600/30 overflow-hidden"
                style={{
                  background: 'rgba(30, 41, 59, 0.8)',
                  backdropFilter: 'blur(20px)',
                  WebkitBackdropFilter: 'blur(20px)'
                }}
              >
                {/* Multi-layer animated gradient background */}
                <motion.div
                  className="absolute inset-0 opacity-40 group-hover:opacity-80 transition-opacity duration-500"
                  animate={{
                    background: [
                      'radial-gradient(circle at 40% 50%, rgba(20,184,166,0.15) 0%, transparent 50%)',
                      'radial-gradient(circle at 60% 30%, rgba(249,115,22,0.15) 0%, transparent 50%)',
                      'radial-gradient(circle at 50% 70%, rgba(20,184,166,0.15) 0%, transparent 50%)',
                      'radial-gradient(circle at 40% 50%, rgba(20,184,166,0.15) 0%, transparent 50%)',
                    ]
                  }}
                  transition={{
                    duration: 12,
                    repeat: Infinity,
                    ease: 'easeInOut'
                  }}
                />

                {/* Additional animated layer for depth */}
                <motion.div
                  className="absolute inset-0 opacity-30 group-hover:opacity-50 transition-opacity duration-500"
                  animate={{
                    background: [
                      'linear-gradient(45deg, rgba(20,184,166,0.05) 0%, transparent 100%)',
                      'linear-gradient(135deg, rgba(249,115,22,0.05) 0%, transparent 100%)',
                      'linear-gradient(225deg, rgba(20,184,166,0.05) 0%, transparent 100%)',
                      'linear-gradient(315deg, rgba(249,115,22,0.05) 0%, transparent 100%)',
                      'linear-gradient(45deg, rgba(20,184,166,0.05) 0%, transparent 100%)',
                    ]
                  }}
                  transition={{
                    duration: 16,
                    repeat: Infinity,
                    ease: 'easeInOut'
                  }}
                />

                {/* Content */}
                <div className="relative z-10 text-center">
                  <motion.div
                    initial={{ scale: 0 }}
                    whileInView={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 100 }}
                    viewport={{ once: true }}
                  >
                    <Badge className="inline-block mb-6 bg-gradient-to-r from-teal-500/20 to-orange-500/20 text-teal-300 border border-teal-500/50 animate-pulse">
                      ✨ {lang === 'tr' ? 'Geleceğinizi Kazandırıyoruz' : 'Securing Your Future'}
                    </Badge>
                  </motion.div>

                  <motion.h2
                    className="text-2xl md:text-4xl font-bold text-white mb-3 md:mb-4 tracking-tight bg-gradient-to-r from-teal-400 via-white to-orange-400 bg-clip-text text-transparent"
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.1 }}
                    viewport={{ once: true }}
                  >
                    {t.ecosystem.title}
                  </motion.h2>

                  <motion.p
                    className="text-slate-300 text-lg mb-2"
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                    viewport={{ once: true }}
                  >
                    {t.ecosystem.subtitle}
                  </motion.p>

                  <motion.p
                    className="text-slate-400 text-base leading-relaxed mb-10"
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.3 }}
                    viewport={{ once: true }}
                  >
                    {t.ecosystem.desc}
                  </motion.p>

                  <Button
                    className="relative bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 text-white font-bold px-8 py-3 text-base h-auto shadow-lg hover:shadow-teal-500/50 transition-all group overflow-hidden mb-12"
                    onClick={() => openLeadModal('pilot_program')}
                  >
                    <span className="relative z-10 flex items-center justify-center">
                      {t.ecosystem.cta}
                      <motion.span
                        animate={{ x: [0, 4, 0] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                      >
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </motion.span>
                    </span>
                  </Button>

                  {/* Partner "Coming Soon" Teaser Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8 md:mt-12 w-full max-w-4xl mx-auto">
                    {t.ecosystem.partners.map((partner, idx) => (
                      <motion.div
                        key={idx}
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.2 + idx * 0.1, duration: 0.5 }}
                        className="group/card relative bg-slate-800/20 backdrop-blur-md border border-slate-700/50 rounded-xl p-6 transition-all duration-300 hover:border-teal-500/30 hover:bg-slate-800/40 text-left overflow-hidden"
                      >
                        <div className="absolute top-3 right-3">
                          <Badge variant="outline" className="text-[10px] font-bold border-teal-500/30 text-teal-400 py-0 px-2 uppercase tracking-tight bg-teal-500/5">
                            {t.ecosystem.comingSoon}
                          </Badge>
                        </div>

                        <div className="w-10 h-10 rounded-lg bg-slate-900 flex items-center justify-center mb-4 border border-slate-800 group-hover/card:border-teal-500/30 transition-colors">
                          <Lock className="w-5 h-5 text-teal-500/70 group-hover/card:text-teal-400 transition-colors" />
                        </div>

                        <h4 className="text-white font-bold text-sm mb-1 group-hover/card:text-teal-300 transition-colors">
                          {partner.title}
                        </h4>
                        <p className="text-slate-400 text-xs leading-relaxed">
                          {partner.desc}
                        </p>

                        {/* Subtle background glow */}
                        <div className="absolute -bottom-10 -right-10 w-24 h-24 bg-teal-500/5 blur-2xl rounded-full group-hover/card:bg-teal-500/10 transition-colors pointer-events-none" />
                      </motion.div>
                    ))}
                  </div>
                </div>

                {/* Enhanced border glow effect */}
                <motion.div
                  className="absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
                  animate={{
                    boxShadow: [
                      '0 0 60px rgba(20, 184, 166, 0.3), inset 0 0 60px rgba(20, 184, 166, 0.05)',
                      '0 0 80px rgba(249, 115, 22, 0.3), inset 0 0 60px rgba(249, 115, 22, 0.05)',
                      '0 0 60px rgba(20, 184, 166, 0.3), inset 0 0 60px rgba(20, 184, 166, 0.05)',
                    ]
                  }}
                  transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
                />
              </div>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ===== PRICING SECTION ===== */}
      <section id="pricing" className="py-12 md:py-20 bg-gradient-to-b from-[#0f172a] via-[#0d3d3d] to-[#0f172a] relative z-10">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center mb-6 md:mb-12">
            <FadeIn>
              <span className="inline-block py-1 px-3 rounded-full bg-teal-500/10 text-teal-400 text-xs font-bold tracking-wider mb-3 uppercase border border-teal-500/20">
                <Building2 className="w-3 h-3 inline mr-1" /> {t.pricing.badge}
              </span>
              <h2 className="text-2xl md:text-5xl font-bold mb-3 md:mb-4 text-white tracking-tight">
                {t.pricing.title} <span className="text-teal-400">{t.pricing.titleHighlight}</span>
              </h2>
              <p className="text-slate-300 text-base md:text-lg max-w-2xl mx-auto leading-relaxed">
                {t.pricing.subtitle}
              </p>
            </FadeIn>
          </div>

          {/* Pricing Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 mb-8 md:mb-12 items-stretch">
            {/* Plan 1: Butik */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1, duration: 0.5 }}
              className="bg-slate-800/40 border border-slate-700 rounded-2xl p-6 flex flex-col hover:border-teal-500/30 transition-all group"
            >
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 rounded-xl bg-slate-700/50 flex items-center justify-center group-hover:bg-teal-500/10 transition-colors">
                  <Building2 className="w-6 h-6 text-slate-300 group-hover:text-teal-400" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">{t.pricing.plan1.name}</h3>
                  <p className="text-xs text-slate-400">{t.pricing.plan1.desc}</p>
                </div>
              </div>

              <ul className="space-y-3 mb-8 flex-1">
                {t.pricing.plan1.features.map((feat, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-slate-300">
                    <CheckCircle2 className="w-4 h-4 text-slate-500 flex-shrink-0 mt-0.5" />
                    <span>{feat}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-auto pt-6 border-t border-slate-700/50">
                <div className="text-lg font-bold text-white mb-1">{t.pricing.plan1.priceTitle}</div>
                <p className="text-xs text-slate-500 mb-4">{t.pricing.plan1.priceSubtitle}</p>
                <Button
                  className="w-full bg-slate-700 hover:bg-slate-600 text-white"
                  onClick={() => openLeadModal('info_request')}
                >
                  {t.pricing.plan1.cta}
                </Button>
              </div>
            </motion.div>

            {/* Plan 2: Zincir (HIGHLIGHT) */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="bg-gradient-to-b from-slate-800 to-[#0f172a] border-2 border-teal-500/50 rounded-2xl p-6 flex flex-col relative shadow-2xl transform md:-translate-y-4 z-10"
            >
              <div className="absolute top-0 right-0 bg-teal-500 text-slate-900 text-[10px] font-bold px-3 py-1 rounded-bl-lg rounded-tr-lg uppercase tracking-wider">
                {t.pricing.plan2.badge}
              </div>

              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 rounded-xl bg-teal-500/20 flex items-center justify-center">
                  <Layers className="w-6 h-6 text-teal-400" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">{t.pricing.plan2.name}</h3>
                  <p className="text-xs text-teal-200/70">{t.pricing.plan2.desc}</p>
                </div>
              </div>

              <ul className="space-y-3 mb-8 flex-1">
                {t.pricing.plan2.features.map((feat, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-white font-medium">
                    <CheckCircle2 className="w-4 h-4 text-teal-400 flex-shrink-0 mt-0.5" />
                    <span>{feat}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-auto pt-6 border-t border-teal-500/30">
                <div className="text-lg font-bold text-teal-400 mb-1">{t.pricing.plan2.priceTitle}</div>
                <p className="text-xs text-slate-400 mb-4">{t.pricing.plan2.priceSubtitle}</p>
                <Button
                  className="w-full bg-teal-500 hover:bg-teal-600 text-white font-bold"
                  onClick={() => openLeadModal('info_request')}
                >
                  {t.pricing.plan2.cta}
                </Button>
              </div>
            </motion.div>

            {/* Plan 3: Enterprise */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3, duration: 0.5 }}
              className="bg-slate-800/40 border border-slate-700 rounded-2xl p-6 flex flex-col hover:border-purple-500/40 transition-all group"
            >
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center group-hover:bg-purple-500/20 transition-colors">
                  <Globe2 className="w-6 h-6 text-purple-400" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">{t.pricing.plan3.name}</h3>
                  <p className="text-xs text-slate-400">{t.pricing.plan3.desc}</p>
                </div>
              </div>

              <ul className="space-y-3 mb-8 flex-1">
                {t.pricing.plan3.features.map((feat, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-slate-300">
                    <CheckCircle2 className="w-4 h-4 text-purple-400 flex-shrink-0 mt-0.5" />
                    <span>{feat}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-auto pt-6 border-t border-slate-700/50">
                <div className="text-lg font-bold text-purple-400 mb-1">{t.pricing.plan3.priceTitle}</div>
                <p className="text-xs text-slate-500 mb-4">{t.pricing.plan3.priceSubtitle}</p>
                <Button
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold"
                  onClick={() => openLeadModal('info_request')}
                >
                  {t.pricing.plan3.cta}
                </Button>
              </div>
            </motion.div>
          </div>

          {/* Common Features Box */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 max-w-5xl mx-auto text-center"
          >
            <h4 className="text-sm font-semibold text-slate-400 uppercase tracking-widest mb-6">
              {t.pricing.commonTitle}
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {t.pricing.commonFeatures.map((item, i) => (
                <div
                  key={i}
                  className="flex items-center justify-center gap-2 text-sm text-slate-300 bg-slate-800/50 py-2 rounded-lg border border-slate-700/50"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-teal-500" /> {item}
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section >

      {/* ===== IMPACT SECTION ===== */}
      < section id="impact" className="py-24 bg-[#0f172a] text-center relative z-10" >
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <h2 className="text-3xl font-bold mb-4 text-white tracking-tight">
              {t.impact.title}
            </h2>
            <p className="text-slate-400 mb-16 max-w-2xl mx-auto leading-relaxed">
              {t.impact.subtitle}
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {[
              {
                icon: TrendingUp,
                title: t.impact.metric1.title,
                desc: t.impact.metric1.desc,
                color: 'text-teal-400'
              },
              {
                icon: Target,
                title: t.impact.metric2.title,
                desc: t.impact.metric2.desc,
                color: 'text-teal-400'
              },
              {
                icon: RefreshCw,
                title: t.impact.metric3.title,
                desc: t.impact.metric3.desc,
                color: 'text-teal-400'
              }
            ].map((metric, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.5 }}
                transition={{ delay: idx * 0.2, duration: 0.5 }}
                className="p-8 rounded-xl bg-slate-800/40 border border-slate-700/50 hover:border-teal-500/30 transition-all group"
              >
                <div className={cn(
                  "w-12 h-12 rounded-lg bg-teal-500/10 flex items-center justify-center mb-6 mx-auto group-hover:bg-teal-500/20 transition-colors"
                )}>
                  <metric.icon className={cn("w-6 h-6", metric.color)} />
                </div>
                <h3 className="text-xl font-bold text-white mb-3 tracking-tight">
                  {metric.title}
                </h3>
                <p className="text-slate-400 text-sm leading-relaxed">
                  {metric.desc}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section >

      {/* ===== V2 AI VISION SECTION ===== */}
      < section id="v2-vision" className="py-20 md:py-28 bg-gradient-to-br from-[#0f172a] via-slate-900/50 to-[#0f172a] relative overflow-hidden z-10 border-t border-slate-800" >
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="mx-auto px-4 relative z-10 flex flex-col items-center justify-center text-center max-w-6xl w-full"
        >
          {/* V2 AI Visual Header */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            animate={{
              opacity: [0.9, 1, 0.9],
              scale: [1, 1.03, 1]
            }}
            transition={{
              duration: 0.8,
              delay: 0.05,
              opacity: { duration: 3, repeat: Infinity },
              scale: { duration: 3, repeat: Infinity }
            }}
            className="mb-8 relative w-full flex justify-center"
          >
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <motion.div
                animate={{
                  opacity: [0.4, 0.6, 0.4],
                  scale: [0.95, 1.05, 0.95]
                }}
                transition={{
                  duration: 4,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
                style={{
                  width: '300px',
                  height: '200px',
                  background: 'radial-gradient(ellipse at center, rgba(20,184,166,0.25) 0%, rgba(34,211,238,0.15) 30%, transparent 80%)',
                  filter: 'blur(40px)',
                  position: 'absolute'
                }}
              />
            </div>

            <motion.h2
              animate={{
                opacity: [0.95, 1, 0.95],
                scale: [1, 1.02, 1]
              }}
              transition={{
                duration: 4,
                repeat: Infinity,
                ease: "easeInOut"
              }}
              className="text-6xl md:text-7xl lg:text-8xl font-black text-transparent bg-clip-text bg-gradient-to-r from-teal-300 via-cyan-300 to-teal-300 relative z-10"
            >
              V2 AI
            </motion.h2>
          </motion.div>

          {/* Badge: Coming Soon */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-teal-500/10 border border-teal-500/30 mb-6 backdrop-blur-sm"
          >
            <div className="w-2 h-2 rounded-full bg-teal-400 animate-pulse" />
            <span className="text-xs font-semibold text-teal-400 uppercase tracking-wider">
              {t.v2.badge}
            </span>
          </motion.div>

          {/* Main Heading */}
          <motion.h3
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 tracking-tight leading-tight"
          >
            {t.v2.title} <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-cyan-400">{t.v2.titleHighlight}</span>
          </motion.h3>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, delay: 0.3 }}
            className="text-lg md:text-xl text-slate-300 mb-10 max-w-4xl leading-relaxed font-light"
          >
            {t.v2.subtitle} <span className="font-semibold text-white">{t.v2.subtitle2}</span>
            {t.v2.subtitle3} <span className="font-semibold text-white">{t.v2.subtitle4}</span> {t.v2.subtitle5}
          </motion.p>

          {/* Key Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 w-full mb-12">
            {[
              { icon: Target, title: t.v2.features.f1.title, desc: t.v2.features.f1.desc },
              { icon: TrendingUp, title: t.v2.features.f2.title, desc: t.v2.features.f2.desc },
              { icon: Lightbulb, title: t.v2.features.f3.title, desc: t.v2.features.f3.desc },
              { icon: Globe2, title: t.v2.features.f4.title, desc: t.v2.features.f4.desc }
            ].map((feature, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2 + idx * 0.1, duration: 0.6 }}
                className="group relative backdrop-blur-md bg-white/5 border border-white/10 rounded-2xl p-6 hover:border-teal-500/40 transition-all duration-300 hover:bg-white/8"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-teal-500/10 to-transparent opacity-0 group-hover:opacity-100 rounded-2xl transition-opacity duration-300" />

                <div className="relative z-10">
                  <div className="w-12 h-12 rounded-xl bg-teal-500/20 border border-teal-500/30 flex items-center justify-center mb-4 group-hover:border-teal-500/60 transition-colors">
                    <feature.icon className="w-6 h-6 text-teal-400" />
                  </div>
                  <h4 className="text-lg font-bold text-white mb-2 text-left">{feature.title}</h4>
                  <p className="text-slate-400 text-sm leading-relaxed text-left">{feature.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>

          {/* V2 Pricing Teaser Box */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.6, duration: 0.7 }}
            className="w-full max-w-3xl mx-auto backdrop-blur-lg bg-gradient-to-r from-teal-500/10 via-cyan-500/5 to-blue-500/10 border border-teal-500/30 rounded-2xl p-8 shadow-lg"
          >
            <div className="flex flex-col md:flex-row items-start gap-6">
              <div className="flex-shrink-0">
                <div className="flex items-center justify-center h-14 w-14 rounded-lg bg-teal-500/20 border border-teal-500/40">
                  <Sparkles className="h-7 w-7 text-teal-400" />
                </div>
              </div>
              <div className="flex-1">
                <h4 className="text-2xl font-bold text-white mb-3">{t.v2.pricingTitle}</h4>
                <p className="text-slate-300 leading-relaxed text-base mb-4">
                  {t.v2.pricingDesc1} <span className="font-bold text-teal-400">{t.v2.pricingDesc2}</span> {t.v2.pricingDesc3}
                </p>
                <div className="space-y-3 mb-5">
                  <div className="bg-slate-900/50 border border-teal-500/20 rounded-lg p-4">
                    <p className="text-slate-300 text-sm flex items-start gap-3 mb-2">
                      <CheckCircle2 className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                      <span>
                        <span className="font-semibold text-white">{t.v2.pricingPoint1}</span> {t.v2.pricingPoint1Desc}
                      </span>
                    </p>
                  </div>
                  <div className="bg-gradient-to-r from-teal-900/30 to-cyan-900/30 border border-teal-500/30 rounded-lg p-4">
                    <p className="text-slate-300 text-sm flex items-start gap-3">
                      <BrainCircuit className="w-5 h-5 text-teal-400 flex-shrink-0 mt-0.5" />
                      <span>
                        <span className="font-semibold text-teal-400">{t.v2.pricingPoint2}</span> {t.v2.pricingPoint2Desc}
                      </span>
                    </p>
                  </div>
                  <p className="text-slate-400 text-sm flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0" />
                    <span>
                      <span className="font-semibold text-slate-300">{t.v2.pricingPoint3}</span> {t.v2.pricingPoint3Desc}
                    </span>
                  </p>
                </div>
                <Button
                  className="bg-teal-600 hover:bg-teal-700 text-white font-bold mt-2"
                  onClick={() => openLeadModal('info_request')}
                >
                  <Mail className="w-4 h-4 mr-2" /> {t.v2.ctaV2}
                </Button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </section >

      {/* ===== GLOBAL REACH SECTION - ENTERPRISE DATA FLOW DESIGN ===== */}
      <section id="global-map" className="relative w-full min-h-[400px] md:min-h-[600px] md:h-[80vh] bg-[#0f172a] overflow-hidden border-y border-slate-800 flex items-center justify-center">

        {/* 1. KATMAN: Harita ve Veri Akışı (Arka Plan) */}
        <div className="absolute inset-0 w-full h-full z-0 pointer-events-none opacity-40">
          <WorldMap
            dots={[
              {
                start: { lat: 41.5, lng: 35.5, label: lang === 'tr' ? 'Türkiye' : 'Turkey' },
                end: { lat: 48.8566, lng: 2.3522, label: 'Paris' }
              },
              {
                start: { lat: 41.5, lng: 35.5, label: lang === 'tr' ? 'Türkiye' : 'Turkey' },
                end: { lat: 40.7128, lng: -74.0060, label: 'New York' }
              },
              {
                start: { lat: 41.5, lng: 35.5, label: lang === 'tr' ? 'Türkiye' : 'Turkey' },
                end: { lat: 25.2048, lng: 55.2708, label: 'Dubai' }
              },
              {
                start: { lat: 41.5, lng: 35.5, label: lang === 'tr' ? 'Türkiye' : 'Turkey' },
                end: { lat: 35.6762, lng: 139.6503, label: 'Tokyo' }
              },
              {
                start: { lat: 41.5, lng: 35.5, label: lang === 'tr' ? 'Türkiye' : 'Turkey' },
                end: { lat: 51.5074, lng: -0.1278, label: 'London' }
              }
            ]}
            lineColor="#14b8a6"
            showLabels={false} // Temiz görünüm için etiketleri kapattık, sadece noktalar ve çizgiler
            animationDuration={3} // Veri akışı hızı
            loop={true}
          />
        </div>

        {/* 2. KATMAN: İçerik (Ön Plan) */}
        <div className="container mx-auto px-4 relative z-10 pointer-events-none text-center">
          <FadeIn>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/10 border border-teal-500/20 mb-6 backdrop-blur-sm">
              <div className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse" />
              <span className="text-[10px] md:text-xs font-black uppercase tracking-[0.2em] text-teal-400">
                {lang === 'tr' ? 'Global Operasyon Ağı' : 'Global Operation Network'}
              </span>
            </div>

            {/* Responsive Başlık: Mobilde daha dengeli, Masaüstünde görkemli */}
            <h2 className="text-3xl sm:text-4xl md:text-7xl font-bold text-white tracking-tighter mb-4 [text-shadow:_0_4px_15px_rgba(0,0,0,0.8)]">
              {lang === 'tr' ? 'SINIRLARI AŞAN ERİŞİM' : 'REACH BEYOND BORDERS'}
            </h2>

            <div className="max-w-xl mx-auto space-y-8">
              {/* Teal Vurgu: Geniş harf boşluğu */}
              <p className="text-teal-400 text-[10px] md:text-sm font-black uppercase tracking-[0.5em] opacity-90">
                {lang === 'tr' ? 'YAKINDA TÜM DÜNYADA' : 'COMING SOON GLOBALLY'}
              </p>

              <p className="text-slate-400 text-xs md:text-lg font-light leading-relaxed">
                {lang === 'tr'
                  ? 'Kıtalar arası veri akışı ile tüm şubeleriniz tek bir global ağda birleşiyor.'
                  : 'All your branches unite in a single global network with real-time data flow.'}
              </p>

              {/* Şehir Listesi: Sydney -> Paris güncellendi */}
              <div className="flex flex-wrap justify-center items-center gap-x-4 md:gap-x-8 gap-y-2 pt-8 border-t border-slate-800/50">
                {['LONDON', 'NEW YORK', 'DUBAI', 'TOKYO', 'PARIS'].map((city) => (
                  <span key={city} className="text-[9px] md:text-xs font-bold text-slate-500 tracking-[0.2em] hover:text-teal-400 transition-colors">
                    {city}
                  </span>
                ))}
              </div>
            </div>
          </FadeIn>
        </div>

        {/* Kenar Gradyanları: Haritanın tasarımın içinde erimesini sağlar */}
        <div className="absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-[#0f172a] to-transparent z-20" />
        <div className="absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-[#0f172a] to-transparent z-20" />
      </section>

      {/* ===== FOOTER ===== */}
      < footer className="bg-[#0f172a] py-8 border-t border-slate-800 relative z-10 text-center" >
        <div className="container mx-auto px-4">
          <p className="text-slate-500 text-xs mb-4">
            {t.footer.copyright}
          </p>

          <div className="mb-4">
            <span
              className="text-sm text-teal-400 cursor-pointer hover:text-teal-300 hover:underline transition-colors mx-2"
              onClick={() => handleLegalLinkClick('kvkk')}
            >
              {t.footer.kvkk}
            </span>
            <span className="text-slate-600">|</span>
            <span
              className="text-sm text-teal-400 cursor-pointer hover:text-teal-300 hover:underline transition-colors mx-2"
              onClick={() => handleLegalLinkClick('terms')}
            >
              {t.footer.terms}
            </span>
          </div>

          <div className="flex justify-center gap-6 items-center">
            <div
              onClick={scrollToTop}
              className="w-6 h-6 text-slate-600 hover:text-white cursor-pointer flex items-center justify-center transition-colors"
            >
              <img
                src="faviconbeyaz.png"
                alt="Vocalize Logo Footer"
                className="h-full w-full object-contain brightness-110"
              />
            </div>

            <a
              href="https://www.instagram.com/vocalize.global/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-slate-500 hover:text-[#E1306C] transition-colors"
              aria-label="Instagram"
            >
              <Instagram className="w-5 h-5" />
            </a>

            <a
              href="mailto:support@vocalize.global"
              className="text-slate-500 hover:text-teal-400 transition-colors"
              aria-label={lang === 'tr' ? 'E-posta Gönder' : 'Send Email'}
            >
              <Mail className="w-5 h-5" />
            </a>
          </div>
        </div>
      </footer >

      {/* ===== MODALS ===== */}

      {/* Auth Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        defaultTab={authDefaultTab}
        defaultRole={authDefaultRole}
        showGuestOption={true}
        onGuestContinue={handleGuestContinue}
      />

      {/* Installation Request Modal */}
      <InstallationRequestModal
        isOpen={installModalOpen}
        onClose={() => setInstallModalOpen(false)}
        initialSector={selectedSector}
      />

      {/* Lead Modal */}
      <Dialog open={leadModalOpen} onOpenChange={setLeadModalOpen}>
        <DialogContent className="w-[93vw] sm:max-w-[500px] bg-slate-900 border-slate-800 text-white max-h-[90vh] overflow-y-auto rounded-lg sm:rounded-xl">
          <DialogHeader>
            <DialogTitle className="text-white">
              {t.leadModal.title}
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              {t.leadModal.subtitle}
            </DialogDescription>
          </DialogHeader>

          {leadType === 'info_request' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 my-2">
              {t.leadModal.quickOptions.map((option, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleQuickOption(option)}
                  className="text-xs text-left p-2 rounded border border-slate-700 bg-slate-800/50 hover:bg-slate-700 hover:text-white text-slate-300 transition-colors flex items-center gap-1"
                >
                  <ArrowRight className="w-3 h-3 flex-shrink-0" />
                  <span className="line-clamp-2">{option}</span>
                </button>
              ))}
            </div>
          )}

          <form onSubmit={handleLeadSubmit} className="grid gap-4 py-2">
            <div className="grid gap-2">
              <label htmlFor="name" className="text-sm font-medium text-slate-200">
                {t.leadModal.nameLabel} *
              </label>
              <Input
                id="name"
                placeholder={t.leadModal.namePlaceholder}
                value={leadForm.name}
                onChange={(e) => setLeadForm({ ...leadForm, name: e.target.value })}
                className="bg-slate-800 border-slate-700 text-white"
                required
              />
            </div>

            <div className="grid gap-2">
              <label htmlFor="email" className="text-sm font-medium text-slate-200">
                {t.leadModal.emailLabel} *
              </label>
              <Input
                id="email"
                type="email"
                placeholder={t.leadModal.emailPlaceholder}
                value={leadForm.email}
                onChange={(e) => setLeadForm({ ...leadForm, email: e.target.value })}
                className="bg-slate-800 border-slate-700 text-white"
                required
              />
            </div>

            <div className="grid gap-2">
              <label htmlFor="phone" className="text-sm font-medium text-slate-200">
                {t.leadModal.phoneLabel}
              </label>
              <Input
                id="phone"
                type="tel"
                placeholder={t.leadModal.phonePlaceholder}
                value={leadForm.phone}
                onChange={(e) => setLeadForm({ ...leadForm, phone: e.target.value })}
                className="bg-slate-800 border-slate-700 text-white"
              />
            </div>

            <div className="grid gap-2">
              <label htmlFor="message" className="text-sm font-medium text-slate-200">
                {t.leadModal.messageLabel} *
              </label>
              <textarea
                id="message"
                rows="4"
                placeholder={t.leadModal.messagePlaceholder}
                value={leadForm.message}
                onChange={(e) => setLeadForm({ ...leadForm, message: e.target.value })}
                className="w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
                required
              />
            </div>

            <DialogFooter className="mt-2">
              <Button
                type="submit"
                disabled={leadLoading}
                className="bg-slate-700 hover:bg-slate-600 text-white w-full"
              >
                {leadLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {t.leadModal.submit}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Legal Modal (KVKK & Terms) */}
      <Dialog
        open={legalModal.isOpen}
        onOpenChange={(open) => setLegalModal((prev) => ({ ...prev, isOpen: open }))}
      >
        <DialogContent className="w-[93vw] sm:max-w-[600px] bg-[#0f172a] border-slate-700 text-white max-h-[85vh] overflow-y-auto rounded-lg sm:rounded-xl">
          <DialogHeader>
            <DialogTitle>
              {legalModal.type === 'terms' ? t.footer.terms : t.footer.kvkk}
            </DialogTitle>
          </DialogHeader>
          <div className="mt-4 p-4 bg-slate-900/50 rounded-lg border border-slate-800 text-sm text-slate-300 leading-relaxed whitespace-pre-wrap font-sans text-justify">
            {legalModal.type === 'terms' ? TERMS_CONTENT : KVKK_CONTENT}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setLegalModal({ ...legalModal, isOpen: false })}
              className="bg-slate-700 hover:bg-slate-600 border-slate-600 text-white hover:text-white"
            >
              {lang === 'tr' ? 'Kapat' : 'Close'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div >
  );
};

export default LandingPage;
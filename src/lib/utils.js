import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"

// 1. CLASS MERGER (Tailwind çakışmaları için)
export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

// --- YARDIMCI FONKSİYONLAR (Internal) ---

// "Emir", "Gürbüz" -> "Emir G." yapan iç fonksiyon
function formatNameComponents(first, last) {
  if (!first) return "Misafir";
  if (!last) return first; 
  return `${first} ${last.charAt(0).toUpperCase()}.`;
}

// "Emir Gürbüz" stringini parçalayıp formatlayan iç fonksiyon
function parseAndFormatString(fullName) {
  if (!fullName) return "Misafir";
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 0) return "Misafir";
  if (parts.length === 1) return parts[0];

  const last = parts.pop();
  const first = parts.join(" ");
  return formatNameComponents(first, last);
}

// --- DIŞA AÇILAN FONKSİYONLAR (Exported) ---

// 2. BASİT İSİM FORMATLAYICI (String alır -> String döner)
// Kullanım: formatCustomerName("Ahmet Yılmaz") -> "Ahmet Y."
export function formatCustomerName(fullName) {
  return parseAndFormatString(fullName);
}

// 3. GELİŞMİŞ İSİM BULUCU (Feedback objesi alır -> String döner)
// Veritabanı ilişkilerini (users, customer_profiles) kontrol eder.
export function getCustomerNameFromFeedback(feedbackItem) {
  if (!feedbackItem) return "Misafir";

  const profile = feedbackItem.customer_profiles || {};
  
  // Supabase join sonuçları bazen array bazen obje gelebilir.
  let userObj = profile.user || profile.users || {};
  if (Array.isArray(userObj)) {
    userObj = userObj[0] || {};
  }

  // Aday verileri topla
  const uFirst = userObj.first_name?.trim();
  const uLast = userObj.last_name?.trim();
  const pName = profile.name?.trim();
  const cName = feedbackItem.customer_name?.trim();

  // Strateji 1: Users Tablosu (En güvenilir kaynak - Kayıtlı Kullanıcı)
  if (uFirst) {
    if (uLast) return formatNameComponents(uFirst, uLast);
    if (uFirst.includes(" ")) return parseAndFormatString(uFirst);
    // Sadece ad var, soyad yok. Profil ismine bakalım eşleşiyor mu?
    if (pName && pName.toLowerCase().startsWith(uFirst.toLowerCase()) && pName.length > uFirst.length) {
       return parseAndFormatString(pName);
    }
    return uFirst;
  }

  // Strateji 2: Profil İsmi (Manuel oluşturulan profil)
  if (pName) return parseAndFormatString(pName);

  // Strateji 3: Feedback Form İsmi (Misafir girişi)
  if (cName) return parseAndFormatString(cName);

  return "Misafir";
}

// 4. VERİ KURTARICI (Telefon/Email gibi verileri bulur)
// Profilde yoksa Feedback anlık görüntüsünden (snapshot) alır.
export function getCustomerData(feedback, field) {
  if (!feedback) return null;

  // Önce Profil tablosuna bak (En güncel veri buradadır)
  const profileData = feedback.customer_profiles?.[field];
  if (profileData) return profileData;
  
  // Profilde yoksa, feedback anındaki veriye bak
  // Mapping: field ismi ile feedback tablosundaki kolon ismi farklı olabilir
  const feedbackKey = field === 'phone' ? 'customer_phone' : 
                      field === 'email' ? 'customer_email' : 
                      field === 'name' ? 'customer_name' : field;
                      
  return feedback?.[feedbackKey] || null;
}

// 5. DELTA HESAPLAYICI (İstatistikler için artış/azalış)
export function calculateDelta(current, previous, metricType = 'total') {
  const isRating = metricType === 'rating';

  // Geçmiş veri yoksa
  if (!previous || previous === 0) {
    if (!current || current === 0) return { val: "-", type: "neutral" };
    return { val: "+%100", type: "increase" };
  }

  const diff = current - previous;

  // Rating Hesaplama (Puan farkı)
  if (isRating) {
    const sign = diff > 0 ? "+" : "";
    const val = `${sign}${diff.toFixed(1)} Puan`;
    let type = "neutral";
    if (diff > 0) type = "increase";
    if (diff < 0) type = "decrease";
    return { val, type };
  }

  // Yüzdelik Hesaplama
  const percentage = Math.round((diff / previous) * 100);
  const sign = percentage > 0 ? "+" : "";
  const val = percentage === 0 ? "%0" : `${sign}%${Math.abs(percentage)}`;

  let type = "neutral";
  if (percentage > 0) type = "increase";
  if (percentage < 0) type = "decrease";

  // Şikayet sayısı arttıysa bu "kötü" (decrease color logic) bir şeydir, 
  // ama burada matematiksel artışı (increase) dönüyoruz. 
  // Rengi component içinde (SparklineCard) yönetiyoruz.
  
  return { val, type };
}
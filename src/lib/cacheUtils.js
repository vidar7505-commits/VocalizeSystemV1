// 🧹 CACHE TEMİZLİK UTİLİTY - Logout/Login sorunlarını önler

/**
 * Vocalize-specific localStorage anahtarlarını temizle
 * Logout veya kritik hatalarda kullan
 */
export const clearVocalizeCache = () => {
  try {
    const keysToRemove = [
      'vocalize_last_business',
      'vocalize_last_branch',
      'vocalize_pending_feedback',
    ];

    keysToRemove.forEach(key => {
      localStorage.removeItem(key);
    });

    
    return true;
  } catch (error) {
    console.error('❌ Cache temizleme hatası:', error);
    return false;
  }
};

/**
 * Yeni cihaz login'de cache çakışmasını önlemek için
 * Login başarılıysa çalıştır
 */
export const handleLoginCleanup = () => {
  try {
    // Eski cihazdan kalan "pending" state'leri temizle
    localStorage.removeItem('vocalize_pending_feedback');
    
    
    return true;
  } catch (error) {
    console.error('❌ Login cleanup hatası:', error);
    return false;
  }
};
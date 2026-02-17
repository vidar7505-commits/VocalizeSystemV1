const DEEPL_API_KEY = import.meta.env.VITE_DEEPL_API_KEY;

export async function translateText(text, targetLang = 'EN') {
  if (!DEEPL_API_KEY) {
    console.error('DeepL API key is missing. Please set VITE_DEEPL_API_KEY in .env');
    return text;
  }

  if (!text || text.trim().length === 0) return text;

  try {
    const isFreeKey = DEEPL_API_KEY.endsWith(':fx');
    const apiUrl = isFreeKey
      ? 'https://api-free.deepl.com/v2/translate'
      : 'https://api.deepl.com/v2/translate';

    const params = new URLSearchParams();
    params.append('auth_key', DEEPL_API_KEY);
    params.append('text', text);
    params.append('target_lang', targetLang.toUpperCase());

    const response = await fetch(apiUrl, {
      method: 'POST',
      body: params,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Translation failed');
    }

    const data = await response.json();
    return data.translations[0].text;
  } catch (error) {
    console.error('DeepL Translation Error:', error);
    return text;
  }
}

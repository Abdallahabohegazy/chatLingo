const LANGUAGE_TO_CODE = {
  english: "en",
  arabic: "ar",
  german: "de",
  french: "fr",
  spanish: "es",
  italian: "it",
  portuguese: "pt",
  russian: "ru",
  chinese: "zh",
  japanese: "ja",
  korean: "ko",
  hindi: "hi",
  turkish: "tr",
  dutch: "nl",
  swedish: "sv",
  norwegian: "no",
  danish: "da",
  polish: "pl",
  ukrainian: "uk",
  greek: "el",
  hebrew: "he",
};

// Common greetings / short phrases so we never get wrong API results (e.g. "اهلا" -> "Kurdistan")
const COMMON_TRANSLATIONS = {
  ar: {
    en: {
      اهلا: "Hello",
      أهلا: "Hello",
      مرحبا: "Hello",
      "السلام عليكم": "Peace be upon you",
      منور: "Nice to see you",
      ازيك: "How are you",
    },
  },
  en: {
    ar: {
      hello: "مرحبا",
      hi: "أهلا",
      "how are you": "ازيك",
    },
  },
};

function getCommonTranslation(text, source, target) {
  const trimmed = String(text).trim();
  if (!trimmed) return null;
  const fromMap = COMMON_TRANSLATIONS[source]?.[target];
  if (!fromMap) return null;
  return fromMap[trimmed] ?? fromMap[trimmed.toLowerCase()] ?? null;
}

// MyMemory sometimes returns wrong/cached results (e.g. "اهلا" -> "Kurdistan")
function isReasonableTranslation(original, translated, source, target) {
  if (!translated || !original) return false;
  const o = String(original).trim();
  const t = String(translated).trim();
  if (o.length < 10 && t.length > 20) return false; // short greeting -> long unrelated word
  const bogus = ["كردستان", "kurdistan", "Kurdistan"];
  if (bogus.some((b) => t.includes(b))) return false;
  return true;
}

export function normalizeLanguageCode(lang) {
  if (!lang) return "";
  const v = String(lang).trim().toLowerCase();
  if (!v) return "";
  if (v.length === 2) return v; // already code like "en"
  return LANGUAGE_TO_CODE[v] || "";
}

export async function translateMessage(text, fromLang, toLang) {
  if (!text || !text.trim()) return text;

  const source = normalizeLanguageCode(fromLang);
  const target = normalizeLanguageCode(toLang);
  if (!target) return text;
  if (source === target) return text;

  const trimmed = String(text).trim();

  // 0) Use known common phrases so we never get wrong API results
  const common = getCommonTranslation(trimmed, source, target);
  if (common) return common;

  const apiKey = process.env.GOOGLE_TRANSLATE_API_KEY;

  // 1) Try Google Translate if key is set
  if (apiKey) {
    try {
      const params = new URLSearchParams({
        q: text,
        target,
        format: "text",
      });
      if (source) params.append("source", source);

      const response = await fetch(
        `https://translation.googleapis.com/language/translate/v2?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: params.toString(),
        }
      );

      if (response.ok) {
        const data = await response.json();
        const translated = data?.data?.translations?.[0]?.translatedText;
        if (translated) return translated;
      }
    } catch (err) {
      console.warn("Google Translate failed, trying fallback:", err.message);
    }
  }

  // 2) Fallback: MyMemory free API (no key required, rate limited)
  try {
    const langPair = source ? `${source}|${target}` : `auto|${target}`;
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${langPair}`;
    const response = await fetch(url);
    if (!response.ok) return text;
    const data = await response.json();
    const translated = data?.responseStatus === 200 && data?.responseData?.translatedText
      ? data.responseData.translatedText.trim()
      : "";
    if (translated && isReasonableTranslation(trimmed, translated, source, target)) {
      return translated;
    }
  } catch (err) {
    console.warn("MyMemory translation failed:", err.message);
  }

  return text;
}


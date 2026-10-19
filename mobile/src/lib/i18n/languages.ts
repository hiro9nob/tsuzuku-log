// docs/concept.md「対応言語」
// このファイルは React Native に依存させない（単体テストのため）

export type LanguageCode = 'ja' | 'en' | 'zh-CN' | 'zh-TW' | 'ko' | 'es' | 'fr' | 'de' | 'pt' | 'th' | 'id';

export type LanguagePreference = 'system' | LanguageCode;

/** 端末の言語が対応外のときは英語 */
export const FALLBACK_LANGUAGE: LanguageCode = 'en';

export const LANGUAGES: readonly { code: LanguageCode; nativeName: string }[] = [
  { code: 'ja', nativeName: '日本語' },
  { code: 'en', nativeName: 'English' },
  { code: 'zh-CN', nativeName: '简体中文' },
  { code: 'zh-TW', nativeName: '繁體中文' },
  { code: 'ko', nativeName: '한국어' },
  { code: 'es', nativeName: 'Español' },
  { code: 'fr', nativeName: 'Français' },
  { code: 'de', nativeName: 'Deutsch' },
  { code: 'pt', nativeName: 'Português' },
  { code: 'th', nativeName: 'ไทย' },
  { code: 'id', nativeName: 'Bahasa Indonesia' },
];

const SIMPLE: Record<string, LanguageCode> = {
  ja: 'ja',
  en: 'en',
  ko: 'ko',
  es: 'es',
  fr: 'fr',
  de: 'de',
  pt: 'pt',
  th: 'th',
  id: 'id',
  in: 'id', // インドネシア語の古いコード
};

const TRADITIONAL_REGIONS = new Set(['TW', 'HK', 'MO']);

export function isLanguagePreference(value: unknown): value is LanguagePreference {
  return value === 'system' || LANGUAGES.some((l) => l.code === value);
}

/**
 * BCP 47 の言語タグを11言語に振り分ける。対応外なら null。
 * 中国語は文字体系（Hans / Hant）を優先し、なければ地域で判断する。
 */
export function matchLanguageTag(tag: string): LanguageCode | null {
  const parts = tag.replace(/_/g, '-').split('-');
  const language = parts[0]?.toLowerCase();
  if (!language) return null;

  if (language === 'zh') {
    const rest = parts.slice(1);
    const script = rest.find((p) => p.length === 4)?.toLowerCase();
    if (script === 'hant') return 'zh-TW';
    if (script === 'hans') return 'zh-CN';
    const region = rest.find((p) => p.length === 2)?.toUpperCase();
    if (region && TRADITIONAL_REGIONS.has(region)) return 'zh-TW';
    return 'zh-CN';
  }

  return SIMPLE[language] ?? null;
}

/** 端末の言語の優先順に見て、最初に対応している言語を返す */
export function resolveLanguage(tags: readonly string[]): LanguageCode {
  for (const tag of tags) {
    const code = matchLanguageTag(tag);
    if (code) return code;
  }
  return FALLBACK_LANGUAGE;
}

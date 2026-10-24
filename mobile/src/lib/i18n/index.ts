import './intl';

import { getLocales } from 'expo-localization';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import { FALLBACK_LANGUAGE, resolveLanguage, type LanguageCode, type LanguagePreference } from './languages';
import de from './locales/de.json';
import en from './locales/en.json';
import es from './locales/es.json';
import fr from './locales/fr.json';
import id from './locales/id.json';
import ja from './locales/ja.json';
import ko from './locales/ko.json';
import pt from './locales/pt.json';
import th from './locales/th.json';
import zhCN from './locales/zh-CN.json';
import zhTW from './locales/zh-TW.json';

const resources = {
  ja: { translation: ja },
  en: { translation: en },
  'zh-CN': { translation: zhCN },
  'zh-TW': { translation: zhTW },
  ko: { translation: ko },
  es: { translation: es },
  fr: { translation: fr },
  de: { translation: de },
  pt: { translation: pt },
  th: { translation: th },
  id: { translation: id },
};

export function deviceLanguage(): LanguageCode {
  return resolveLanguage(getLocales().map((l) => l.languageTag));
}

export function languageFor(preference: LanguagePreference): LanguageCode {
  return preference === 'system' ? deviceLanguage() : preference;
}

let initialized = false;

export async function initI18n(preference: LanguagePreference): Promise<void> {
  const lng = languageFor(preference);
  if (initialized) {
    if (i18n.language !== lng) await i18n.changeLanguage(lng);
    return;
  }
  initialized = true;
  await i18n.use(initReactI18next).init({
    resources,
    lng,
    fallbackLng: FALLBACK_LANGUAGE,
    interpolation: { escapeValue: false },
    returnNull: false,
  });
}

/** 言語の設定を反映する。「端末の設定に従う」ときは、アプリに戻るたびに呼んで確認し直す */
export async function applyLanguage(preference: LanguagePreference): Promise<void> {
  const lng = languageFor(preference);
  if (i18n.language !== lng) await i18n.changeLanguage(lng);
}

/** 画面の表示に使うロケール（Intl 用） */
export function currentLocale(): string {
  return i18n.language || FALLBACK_LANGUAGE;
}

export { i18n };

// サイト（サポート、利用規約、プライバシーポリシー）。ドメインは仮（docs/development.md「決めること」）
// サイトは英語と日本語だけ。日本語のときは /ja/ のページ、それ以外は英語のページを開く
import { Platform } from 'react-native';

const SITE = 'https://ongo.no9.app';

/** 課金とレビューの説明に出すストアの名前 */
export const STORE_NAME = Platform.OS === 'android' ? 'Google Play' : 'App Store';

export function legalUrl(page: 'terms' | 'privacy' | 'support', language: string) {
  return `${SITE}${language.startsWith('ja') ? '/ja' : ''}/${page}/`;
}

// 問い合わせのメール。アドレスは仮（docs/development.md「まだ決めていないこと」）
const CONTACT_EMAIL = 'contact@no9.app';

export function mailUrl(subject: string, body: string) {
  return `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

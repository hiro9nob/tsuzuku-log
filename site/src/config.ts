// docs/site.md：【】の仮置きは、公開前にすべて置き換える（pnpm release が止める）
export const OPERATOR = { ja: 'つづくログ運営者', en: 'Ongo Operator' } as const;
export const CONTACT_EMAIL = 'contact@no9.app';

// ストアのページ。公開したら URL を入れる。null のあいだは「まもなく公開」と出す
export const APP_STORE_URL: string | null = null;

// 利用規約とプライバシーポリシーの施行日。下書きのあいだは null（ページに「下書き」と出す）
export const LEGAL_EFFECTIVE_DATE: string | null = '2026-10-20';

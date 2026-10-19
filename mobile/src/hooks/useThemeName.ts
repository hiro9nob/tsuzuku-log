import { useTranslation } from 'react-i18next';

import { PRO_THEME_NAMES, type ThemeDef } from '@/lib/themeColors';

/** テーマの名前。Pro のテーマは見本どおりの英語の固有名、無料のテーマは訳す */
export function useThemeName() {
  const { t } = useTranslation();
  return (def: Pick<ThemeDef, 'id'>): string => {
    const proName = PRO_THEME_NAMES[def.id];
    if (proName) return proName;
    return t('themes.gray');
  };
}

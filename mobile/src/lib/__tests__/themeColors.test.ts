import { HABIT_COLORS } from '../habit';
import { BRAND, contrastRatio, DEFAULT_THEME, PRO_THEME_NAMES, resolveTheme, THEMES } from '../themeColors';

describe('themes', () => {
  it('has 1 free theme and 10 pro color themes with names', () => {
    expect(THEMES.filter((t) => !t.pro).map((t) => t.id)).toEqual(['gray']);
    const pro = THEMES.filter((t) => t.pro);
    expect(pro).toHaveLength(10);
    for (const t of pro) expect(PRO_THEME_NAMES[t.id]).toBeTruthy();
  });

  it('uses the icon color as the free accent', () => {
    for (const t of THEMES.filter((x) => !x.pro)) {
      // 4.5:1 に合わせるためにわずかに濃くすることはあるが、色味はアイコンの緑
      expect(contrastRatio(t.light.accent, BRAND.light)).toBeLessThan(1.3);
      expect(contrastRatio(t.dark.accent, BRAND.dark)).toBeLessThan(1.3);
    }
  });

  it.each(THEMES.flatMap((t) => [[t.id, 'light', t.light] as const, [t.id, 'dark', t.dark] as const]))(
    '%s (%s) keeps 4.5:1 contrast for buttons and text',
    (_id, _mode, p) => {
      expect(contrastRatio(p.accentText, p.accent)).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(p.text, p.background)).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(p.text, p.surface)).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(p.textSecondary, p.surface)).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(p.accent, p.background)).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(p.accent, p.surface)).toBeGreaterThanOrEqual(4.5);
      // 入力欄の上のプレースホルダー
      expect(contrastRatio(p.textSecondary, p.surfaceAlt)).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(p.textSecondary, p.background)).toBeGreaterThanOrEqual(4.5);
      // 選んだアイコン（アクセントの色）とその下地（絵は 3:1）
      expect(contrastRatio(p.accent, p.accentSoft)).toBeGreaterThanOrEqual(3);
    },
  );

  it('falls back to the default theme without Pro', () => {
    expect(resolveTheme('cocoaDusk', false).id).toBe(DEFAULT_THEME);
    expect(resolveTheme('cocoaDusk', true).id).toBe('cocoaDusk');
  });

  // 記録ボタンの「+250」などの文字は、習慣の色でカードの上に書く
  it.each(THEMES.map((t) => [t.id, t] as const))('habit colors are readable on the %s card surface', (_id, t) => {
    for (const c of HABIT_COLORS) {
      expect(contrastRatio(c.light, t.light.surface)).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(c.dark, t.dark.surface)).toBeGreaterThanOrEqual(4.5);
    }
  });
});

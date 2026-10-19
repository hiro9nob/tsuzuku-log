// 外観とテーマ（docs/design-sample/color-theme.png）
// - 無料：デフォルト（灰色の背景）だけ。アクセントの色はアイコンと同じ落ち着いた緑
// - Pro：カラーテーマ10色。見本の3つの丸（メイン、サブ、背景）から、ライト用とダーク用の色を作る
// どのテーマでも、ボタンの文字と背景、文字と背景は 4.5:1 以上（淡い色はアクセントを濃く／明るくして合わせる）
// このファイルは React Native に依存させない（単体テストのため）

export type AppearancePreference = 'system' | 'light' | 'dark';

export const APPEARANCES: readonly AppearancePreference[] = ['system', 'light', 'dark'];

export type ThemeId =
  | 'gray'
  | 'cocoaDusk'
  | 'blueHorizon'
  | 'blushHarmony'
  | 'violetDream'
  | 'cottonBloom'
  | 'earthyMoss'
  | 'crystalMist'
  | 'candyPop'
  | 'midnightLinen'
  | 'sunsetAmber';

export type Palette = {
  background: string;
  surface: string;
  surfaceAlt: string;
  text: string;
  textSecondary: string;
  accent: string;
  accentText: string;
  accentSoft: string;
  divider: string;
  danger: string;
};

/** 一覧に出す3つの丸（メイン、サブ、背景） */
export type Swatches = readonly [string, string, string];

export type ThemeDef = { id: ThemeId; pro: boolean; swatches: Swatches; light: Palette; dark: Palette };

/** 既定のテーマ（無料）。Pro でなくなったときもこのテーマに戻す */
export const DEFAULT_THEME: ThemeId = 'gray';

/** 代表の色（アイコン、起動画面、ストア、サイト）。無料のアクセントの色 */
export const BRAND = { light: '#4A7C59', dark: '#8DBF9C' } as const;

const MIN_CONTRAST = 4.5;

// ---- 色の計算 ----

function toRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function toHex([r, g, b]: [number, number, number]): string {
  return `#${[r, g, b].map((c) => Math.round(Math.min(255, Math.max(0, c))).toString(16).padStart(2, '0')).join('').toUpperCase()}`;
}

/** a と b を混ぜる（t = 0 で a、1 で b） */
export function mix(a: string, b: string, t: number): string {
  const x = toRgb(a);
  const y = toRgb(b);
  return toHex([x[0] + (y[0] - x[0]) * t, x[1] + (y[1] - x[1]) * t, x[2] + (y[2] - x[2]) * t]);
}

function channel(c: number): number {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

function luminance(hex: string): number {
  const [r, g, b] = toRgb(hex);
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

export function contrastRatio(a: string, b: string): number {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/** アクセントの上の文字：白か黒のうち、読みやすいほう */
function textOn(color: string): string {
  return contrastRatio('#FFFFFF', color) >= contrastRatio('#141414', color) ? '#FFFFFF' : '#141414';
}

/**
 * すべての背景に対して 4.5:1 になり、上に置く文字（白か黒）も 4.5:1 で読めるまで、toward（黒か白）に寄せる
 */
function ensureContrast(color: string, backgrounds: string[], toward: string): string {
  const ok = (c: string) => backgrounds.every((bg) => contrastRatio(c, bg) >= MIN_CONTRAST) && contrastRatio(textOn(c), c) >= MIN_CONTRAST;
  let c = color;
  for (let t = 0.04; !ok(c) && t <= 1; t += 0.04) c = mix(color, toward, t);
  return c;
}

// ---- テーマ ----

const monoLight = { text: '#1C1C1E', textSecondary: '#5F6168', danger: '#B3261E' };
const monoDark = { text: '#F2F2F3', textSecondary: '#A6A8AE', danger: '#FF8A80' };

/**
 * 仕上げ：補足の文字（プレースホルダーなど）は、背景・カード・入力欄のどれの上でも 4.5:1。
 * 薄いアクセント（選んだアイコンの下地など）は、アクセントの色の絵が見えるよう 3:1 以上離す
 */
function finish(p: Palette, dark: boolean): Palette {
  const backgrounds = [p.background, p.surface, p.surfaceAlt];
  let textSecondary = p.textSecondary;
  for (let t = 0.05; backgrounds.some((bg) => contrastRatio(textSecondary, bg) < MIN_CONTRAST) && t <= 1; t += 0.05) {
    textSecondary = mix(p.textSecondary, p.text, t);
  }
  let accentSoft = p.accentSoft;
  for (let t = 0.05; contrastRatio(accentSoft, p.accent) < 3 && t <= 1; t += 0.05) {
    accentSoft = mix(p.accentSoft, dark ? '#000000' : '#FFFFFF', t);
  }
  return { ...p, textSecondary, accentSoft };
}

/** 無料のテーマ：アクセントはアイコンの緑 */
function freeTheme(
  id: ThemeId,
  swatches: Swatches,
  light: Pick<Palette, 'background' | 'surface' | 'surfaceAlt' | 'divider'>,
  dark: Pick<Palette, 'background' | 'surface' | 'surfaceAlt' | 'divider'>,
): ThemeDef {
  const lightAccent = ensureContrast(BRAND.light, [light.background, light.surface], '#000000');
  const darkAccent = ensureContrast(BRAND.dark, [dark.background, dark.surface], '#FFFFFF');
  return {
    id,
    pro: false,
    swatches,
    light: finish({ ...monoLight, ...light, accent: lightAccent, accentText: textOn(lightAccent), accentSoft: mix(BRAND.light, light.surface, 0.82) }, false),
    dark: finish({ ...monoDark, ...dark, accent: darkAccent, accentText: textOn(darkAccent), accentSoft: mix(BRAND.dark, dark.surface, 0.78) }, true),
  };
}

/** Pro のテーマ：3つの丸から、ライト用とダーク用の色を作る */
function colorTheme(id: ThemeId, swatches: Swatches): ThemeDef {
  const [main, sub, bg] = swatches;
  const lightBackground = mix(bg, '#FFFFFF', 0.45);
  const lightSurface = '#FFFFFF';
  const lightAccent = ensureContrast(main, [lightBackground, lightSurface], '#000000');
  const darkBackground = mix(main, '#000000', 0.9);
  const darkSurface = mix(main, '#000000', 0.82);
  const darkAccent = ensureContrast(mix(main, '#FFFFFF', 0.25), [darkBackground, darkSurface], '#FFFFFF');
  return {
    id,
    pro: true,
    swatches,
    light: finish({
      ...monoLight,
      background: lightBackground,
      surface: lightSurface,
      surfaceAlt: mix(lightBackground, main, 0.08),
      divider: mix(lightBackground, main, 0.16),
      accent: lightAccent,
      accentText: textOn(lightAccent),
      accentSoft: mix(sub, '#FFFFFF', 0.72),
    }, false),
    dark: finish({
      ...monoDark,
      background: darkBackground,
      surface: darkSurface,
      surfaceAlt: mix(main, '#000000', 0.74),
      divider: mix(main, '#000000', 0.68),
      accent: darkAccent,
      accentText: textOn(darkAccent),
      accentSoft: mix(sub, '#000000', 0.7),
    }, true),
  };
}

export const THEMES: readonly ThemeDef[] = [
  freeTheme(
    'gray',
    [BRAND.light, '#8E8E93', '#F2F2F7'],
    { background: '#F2F2F4', surface: '#FFFFFF', surfaceAlt: '#E9E9EC', divider: '#E2E2E5' },
    { background: '#121212', surface: '#1F1F21', surfaceAlt: '#2A2A2D', divider: '#323235' },
  ),
  // docs/design-sample/color-theme.png の色（メイン、サブ、背景）
  colorTheme('cocoaDusk', ['#6A4F3A', '#9F7D60', '#F2E7D5']),
  colorTheme('blueHorizon', ['#43597D', '#738FAF', '#DEE8F1']),
  colorTheme('blushHarmony', ['#DD7260', '#6DA2A8', '#A3C0BC']),
  colorTheme('violetDream', ['#7569CA', '#A878C3', '#EFE8F5']),
  colorTheme('cottonBloom', ['#E6A4B4', '#EAB3C4', '#FCF0F4']),
  colorTheme('earthyMoss', ['#8DAD94', '#A1BE8F', '#F0E4D9']),
  colorTheme('crystalMist', ['#9AC3D4', '#BBD7E5', '#EEF5F9']),
  colorTheme('candyPop', ['#B6B1ED', '#F2BAE7', '#F9DDCE']),
  colorTheme('midnightLinen', ['#1B3355', '#D2C9BF', '#F1EFEC']),
  // 見本は9色なので、10色目を足した（見本と同じ考え方で、こはく色）
  colorTheme('sunsetAmber', ['#C27C2C', '#E9B872', '#FBF0DE']),
];

/** Pro のテーマの名前（見本どおり、どの言語でも英語の固有名） */
export const PRO_THEME_NAMES: Partial<Record<ThemeId, string>> = {
  cocoaDusk: 'Cocoa Dusk',
  blueHorizon: 'Blue Horizon',
  blushHarmony: 'Blush Harmony',
  violetDream: 'Violet Dream',
  cottonBloom: 'Cotton Bloom',
  earthyMoss: 'Earthy Moss',
  crystalMist: 'Crystal Mist',
  candyPop: 'Candy Pop',
  midnightLinen: 'Midnight Linen',
  sunsetAmber: 'Sunset Amber',
};

export function isAppearancePreference(value: unknown): value is AppearancePreference {
  return typeof value === 'string' && (APPEARANCES as readonly string[]).includes(value);
}

export function isThemeId(value: unknown): value is ThemeId {
  return typeof value === 'string' && THEMES.some((t) => t.id === value);
}

/** 実際に使うテーマ。Pro のテーマは Pro のときだけ使い、それ以外は既定に戻す（選んだ値は残す） */
export function resolveTheme(id: ThemeId, isPro: boolean): ThemeDef {
  const chosen = THEMES.find((t) => t.id === id);
  if (chosen && (!chosen.pro || isPro)) return chosen;
  return THEMES.find((t) => t.id === DEFAULT_THEME)!;
}

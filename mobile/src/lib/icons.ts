// 習慣のアイコン。無料は基本のアイコン約30種、Pro は全アイコン・絵文字・自分の画像
// 保存する値：Ionicons の名前（'water' など）か、'emoji:🏃'、'image:<ファイル名>'（iconImages.ts）の形
// このファイルは React Native に依存させない（単体テストのため）

export const FREE_ICONS = [
  'water',
  'book',
  'walk',
  'bed',
  'language',
  'wine',
  'barbell',
  'bicycle',
  'leaf',
  'sunny',
  'moon',
  'cafe',
  'nutrition',
  'restaurant',
  'medkit',
  'heart',
  'happy',
  'musical-notes',
  'pencil',
  'brush',
  'code-slash',
  'school',
  'cash',
  'home',
  'paw',
  'flower',
  'phone-portrait',
  'timer',
  'checkmark-circle',
  'star',
] as const;

export const PRO_ICONS = [
  'football',
  'basketball',
  'tennisball',
  'golf',
  'fitness',
  'body',
  'footsteps',
  'pulse',
  'bandage',
  'ice-cream',
  'fast-food',
  'pizza',
  'beer',
  'water-outline',
  'game-controller',
  'tv',
  'camera',
  'film',
  'headset',
  'mic',
  'globe',
  'airplane',
  'car',
  'train',
  'briefcase',
  'laptop',
  'mail',
  'chatbubbles',
  'people',
  'person',
  'call',
  'calendar',
  'alarm',
  'hourglass',
  'trash',
  'shirt',
  'sparkles',
  'rose',
  'planet',
  'snow',
  'umbrella',
  'flame',
  'bulb',
  'trophy',
  'ribbon',
  'diamond',
  'gift',
  'cart',
  'wallet',
  'card',
  'construct',
  'hammer',
  'color-palette',
  'library',
  'newspaper',
  'document-text',
  'journal',
  'bookmark',
  'flag',
  'rocket',
] as const;

const EMOJI_PREFIX = 'emoji:';
const IMAGE_PREFIX = 'image:';

export type IconValue = { type: 'ion'; name: string } | { type: 'emoji'; text: string } | { type: 'image'; file: string };

export function parseIcon(value: string): IconValue {
  if (value.startsWith(EMOJI_PREFIX)) return { type: 'emoji', text: value.slice(EMOJI_PREFIX.length) };
  // ファイル名だけを使う（フォルダをまたがない）
  if (value.startsWith(IMAGE_PREFIX)) return { type: 'image', file: value.slice(IMAGE_PREFIX.length).replace(/[/\\]/g, '') };
  return { type: 'ion', name: value };
}

export function imageIcon(file: string): string {
  return IMAGE_PREFIX + file;
}

export function emojiIcon(text: string): string {
  return EMOJI_PREFIX + text;
}

/** Pro のアイコンか（Pro でないときは、選べないが表示はそのまま） */
export function isProIcon(value: string): boolean {
  return !(FREE_ICONS as readonly string[]).includes(value);
}

/** Pro でないときに表示するアイコン。Pro のアイコンと絵文字は、基本のアイコンにする（選んだ値は残す） */
export const FALLBACK_ICON = 'checkmark-circle';

export function effectiveIcon(value: string, isPro: boolean): string {
  return isPro || !isProIcon(value) ? value : FALLBACK_ICON;
}

/** 入力から最初の絵文字（書記素）を1つだけ取り出す。なければ null */
export function firstEmoji(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  const Segmenter = (Intl as unknown as { Segmenter?: new (l?: string, o?: { granularity: string }) => { segment: (s: string) => Iterable<{ segment: string }> } }).Segmenter;
  const first = Segmenter ? [...new Segmenter(undefined, { granularity: 'grapheme' }).segment(trimmed)][0]?.segment : Array.from(trimmed)[0];
  if (!first || !/\p{Extended_Pictographic}/u.test(first)) return null;
  return first;
}

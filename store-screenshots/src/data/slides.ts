// ストアのスクリーンショットの中身。見出しと構成は Codex と相談して決めた（README.md）
// 見出しの改行は \n で決める（1語だけ次の行に落ちないように）

export type Lang = 'ja' | 'en';
export type Store = 'appstore' | 'googleplay';

export const LANGS: Lang[] = ['ja', 'en'];
export const STORES: Store[] = ['appstore', 'googleplay'];

/** 書き出す画像の大きさ（px） */
export const CANVAS: Record<Store, { w: number; h: number }> = {
  // App Store：iPhone 6.9 インチ（1320 x 2868）。小さい画面の分は App Store Connect が縮小して使う
  appstore: { w: 1320, h: 2868 },
  // Google Play：スマートフォン（9:16）
  googleplay: { w: 1080, h: 1920 },
};

/** Google Play のフィーチャーグラフィック */
export const FEATURE = { w: 1024, h: 500 };

/** シミュレータで撮った画面の大きさ（iPhone 16 Pro Max） */
export const RAW = { w: 1320, h: 2868 };

/** 画面の一部 [x, y, 幅, 高さ]（RAW の座標）。言語で位置が違うときは言語ごとに書く */
export type Rect = [number, number, number, number];

/**
 * 画面から切り出して浮かせる部品。位置は「舞台」の座標で書く。
 * 舞台は端末の画面と同じ場所・同じ大きさ（RAW の座標で 1320 x 2868）。端末を出さない枚でも同じ
 */
export type Float = {
  src: string;
  crop: Rect | Record<Lang, Rect>;
  x: number;
  y: number;
  /** 画面の中と比べた大きさ */
  scale: number;
  rotate?: number;
};

/** キャラクターのイラスト（public/ の画像）。位置と幅は舞台の座標 */
export type Art = { src: string; x: number; y: number; w: number; rotate?: number };

/** 画面の一点を指す吹き出し。位置は舞台の座標 */
export type Note = { x: number; y: number; text: Record<Lang, string> };

export type Theme = 'dark' | 'cream' | 'mint';

export type Slide = {
  theme: Theme;
  /** 端末に出す画面（public/raw/<lang>/）。'home' はホーム画面とウィジェット。なしなら端末を出さない */
  screen?: string | 'home';
  floats?: Float[];
  arts?: Art[];
  note?: Note;
  /** 見出しの下に並べる小さな約束 */
  pills?: Record<Lang, string[]>;
  /** 舞台に大きく並べる約束（アイコンと文） */
  promises?: { icon: 'infinity' | 'noads' | 'cloud' | 'import'; text: Record<Lang, string> }[];
  text: Record<Lang, { title: string; sub: string }>;
};

// 切り出す場所（RAW の座標）
const ROW = (y: number): Rect => [48, y, 1224, 272];
const C = {
  summary: [48, 440, 1224, 336] as Rect,
  water: ROW(822),
  read: ROW(1116),
  walk: ROW(1410),
  study: ROW(1704),
  sleep: ROW(1998),
  drink: ROW(2290),
  undo: [48, 2201, 1224, 142] as Rect,
  restSheet: [0, 1236, 1320, 800] as Rect,
  heat: [48, 1374, 1224, 670] as Rect,
  tiles: [48, 808, 1224, 238] as Rect,
  card: [312, 1145, 696, 1233] as Rect,
  frequency: [48, 984, 1224, 870] as Rect,
  review: [48, 665, 1224, 1060] as Rect,
  icloud: { ja: [48, 1352, 1224, 334], en: [48, 1352, 1224, 392] } as Record<Lang, Rect>,
  data: { ja: [48, 1262, 1224, 700], en: [48, 2008, 1224, 492] } as Record<Lang, Rect>,
};

/** 横の真ん中に置くときの x */
const center = (crop: Rect, scale: number) => Math.round((RAW.w - crop[2] * scale) / 2);

export const SLIDES: Slide[] = [
  {
    // 1枚目：一番の違い。お休みの中空の丸を大きく見せ、吹き出しで指す
    theme: 'dark',
    screen: 'today.png',
    floats: [{ src: 'today.png', crop: C.read, x: center(C.read, 1.32), y: 1060, scale: 1.32 }],
    note: { x: 235, y: 1362, text: { ja: 'お休みした日', en: 'Rest day' } },
    pills: { ja: ['習慣はいくつでも', '広告なし', 'ログイン不要'], en: ['Unlimited habits', 'No ads', 'No sign-up'] },
    text: {
      ja: { title: '休んでも、\n途切れない', sub: '体調不良や旅行の日は「お休み」に。\n連続記録はそのまま。' },
      en: { title: "Rest days don't\nbreak your streak", sub: 'Feeling unwell or traveling?\nMark a rest day and keep your streak.' },
    },
  },
  {
    // 2枚目：いくつでも、1タップ。習慣の行を端末の外に並べる
    theme: 'cream',
    floats: [
      { src: 'today.png', crop: C.summary, x: center(C.summary, 1.08), y: 60, scale: 1.08 },
      { src: 'today.png', crop: C.water, x: center(C.water, 1.08), y: 470, scale: 1.08 },
      { src: 'today.png', crop: C.read, x: center(C.read, 1.08), y: 790, scale: 1.08 },
      { src: 'today.png', crop: C.walk, x: center(C.walk, 1.08), y: 1110, scale: 1.08 },
      { src: 'today.png', crop: C.study, x: center(C.study, 1.08), y: 1430, scale: 1.08 },
      // 「早寝」を記録した直後。取り消すの帯は、アプリと同じく行の下に重ねる
      { src: 'today-undo.png', crop: [48, 1998, 1224, 203], x: center(C.sleep, 1.08), y: 1750, scale: 1.08 },
      { src: 'today-undo.png', crop: C.undo, x: center(C.undo, 1.08), y: 1750 + Math.round(203 * 1.08), scale: 1.08 },
      { src: 'today.png', crop: C.drink, x: center(C.drink, 1.08), y: 2140, scale: 1.08 },
    ],
    text: {
      ja: { title: '習慣はいくつでも。\n記録は1タップ。', sub: '水も読書も散歩も。習慣の数に上限なし。\n押しまちがえても、すぐ取り消せる。' },
      en: { title: 'Unlimited habits.\nOne tap to log.', sub: 'Water, reading, walks—no limit on habits.\nTapped by mistake? Undo instantly.' },
    },
  },
  {
    // 3枚目：積み重ねが見える。マス目と連続日数を拡大
    theme: 'mint',
    screen: 'detail.png',
    floats: [
      { src: 'detail.png', crop: C.tiles, x: center(C.tiles, 1.16), y: 760, scale: 1.16 },
      { src: 'detail.png', crop: C.heat, x: center(C.heat, 1.3), y: 1220, scale: 1.3 },
    ],
    text: {
      ja: { title: '積み重ねが、\nひと目でわかる', sub: 'できた日も、お休みの日も、マス目に残る。' },
      en: { title: 'See your progress\nat a glance', sub: 'Every done day and rest day, in one grid.' },
    },
  },
  {
    // 4枚目：乗り換えの不安に答える約束。実画面（マイページと設定）を添える
    theme: 'dark',
    promises: [
      { icon: 'infinity', text: { ja: '習慣の数に\n上限なし', en: 'Unlimited\nhabits' } },
      { icon: 'noads', text: { ja: '広告なし', en: 'No ads' } },
      { icon: 'cloud', text: { ja: 'iCloud に\nバックアップ', en: 'iCloud\nbackup' } },
      { icon: 'import', text: { ja: '他のアプリから\n取り込み', en: 'Import from\nother apps' } },
    ],
    floats: [
      { src: 'me.png', crop: C.icloud, x: center(C.icloud.en, 1.12), y: 1180, scale: 1.12 },
      { src: 'settings.png', crop: C.data, x: center(C.data.en, 1.12), y: 1700, scale: 1.12 },
    ],
    arts: [{ src: 'welcome-dark.png', x: 760, y: 2440, w: 520 }],
    text: {
      ja: { title: '安心して、\nずっと続けられる', sub: '記録はあなたのもの。書き出しも取り込みも。' },
      en: { title: 'Built to\nstay with you', sub: 'Your records stay yours.\nExport and import anytime.' },
    },
  },
  {
    theme: 'mint',
    screen: 'home',
    text: {
      ja: { title: 'アプリを開かずに、\nホーム画面で記録', sub: 'ウィジェットをタップするだけ。' },
      en: { title: 'Log right from\nyour home screen', sub: 'Tap the widget—no need to open the app.' },
    },
  },
  {
    theme: 'cream',
    screen: 'new.png',
    floats: [{ src: 'new.png', crop: C.frequency, x: center(C.frequency, 1.16), y: 860, scale: 1.16 }],
    text: {
      ja: { title: '毎日じゃなくても、\n週3回でいい', sub: '曜日を決めずに、できる日に。' },
      en: { title: "Not every day?\nThat's fine.", sub: 'Set 3 times a week, with no fixed days.' },
    },
  },
  {
    // 7枚目：お祝い。カードを大きく傾け、キャラクターを添える
    theme: 'mint',
    floats: [{ src: 'milestone.png', crop: C.card, x: center(C.card, 1.5), y: 780, scale: 1.5, rotate: -4 }],
    arts: [{ src: 'milestone.png', x: 210, y: 40, w: 900 }],
    text: {
      ja: { title: '続けた節目を、\nそっとお祝い', sub: '7日、30日、100日。シェアできるカードに。' },
      en: { title: "Celebrate how\nfar you've come", sub: '7, 30, 100 days—as a card you can share.' },
    },
  },
  {
    theme: 'cream',
    screen: 'review.png',
    floats: [{ src: 'review.png', crop: C.review, x: center(C.review, 1.14), y: 600, scale: 1.14 }],
    text: {
      ja: { title: '振り返って、\n自分のペースへ', sub: '週と月の達成率を、習慣ごとに。' },
      en: { title: 'Find your rhythm\nover time', sub: 'Weekly and monthly rates for every habit.' },
    },
  },
];

export const BRAND: Record<Lang, { name: string; category: string; feature: string }> = {
  ja: { name: 'つづくログ', category: '習慣トラッカー', feature: '休む日も、\n続ける日々のひとつ。' },
  en: { name: 'Ongo', category: 'Habit Tracker', feature: 'Rest is part\nof the journey.' },
};

/** ホーム画面のウィジェットに出す中身（見本のデータと同じ） */
export const WIDGET: Record<Lang, { today: string; water: string; read: string; walk: string; study: string; appName: string }> = {
  ja: { today: 'きょう', water: '水を飲む', read: '読書', walk: '散歩', study: '英語', appName: 'つづくログ' },
  en: { today: 'Today', water: 'Drink water', read: 'Read', walk: 'Take a walk', study: 'Study a language', appName: 'Ongo' },
};

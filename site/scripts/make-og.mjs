// SNS で共有されたときの画像（public/og-<言語>.png、1200×630）を作る。文を変えたら流し直す（node scripts/make-og.mjs）
import sharp from 'sharp';

const ICON = '../mobile/assets/images/icon.png';
const TEXT = {
  en: { name: 'Ongo', title: 'Rest days don’t', title2: 'break your streak.', sub: 'Habit tracker · Unlimited habits · No ads' },
  ja: { name: 'つづくログ', title: '休んでも、', title2: '途切れない。', sub: '習慣トラッカー・習慣はいくつでも・広告なし' },
};
// できた日は塗りつぶし、お休みは中空の丸（アプリと同じ）
const MARKS = ['done', 'done', 'rest', 'done', 'done', 'rest', 'done'];

for (const [lang, t] of Object.entries(TEXT)) {
  const font = lang === 'ja' ? "'Hiragino Maru Gothic ProN', 'Hiragino Sans', sans-serif" : "Georgia, 'Times New Roman', serif";
  const dots = MARKS.map((m, i) => {
    const cx = 110 + i * 62;
    return m === 'done'
      ? `<circle cx="${cx}" cy="500" r="22" fill="#4A7C59"/>`
      : `<circle cx="${cx}" cy="500" r="19.5" fill="none" stroke="#4A7C59" stroke-width="5"/>`;
  }).join('');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630">
    <rect width="1200" height="630" fill="#F7F5EF"/>
    <text x="88" y="200" font-family="${font}" font-weight="700" font-size="76" fill="#1D231F">${t.title}</text>
    <text x="88" y="296" font-family="${font}" font-weight="700" font-size="76" fill="#1D231F">${t.title2}</text>
    <text x="90" y="386" font-family="'Hiragino Sans', sans-serif" font-size="30" fill="#5B645E">${t.sub}</text>
    ${dots}
    <text x="1112" y="560" text-anchor="end" font-family="'Hiragino Sans', sans-serif" font-weight="700" font-size="34" fill="#4A7C59">${t.name}</text>
  </svg>`;
  const icon = await sharp(ICON).resize(260, 260).png().toBuffer();
  const mask = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="260" height="260"><rect width="260" height="260" rx="58" fill="#fff"/></svg>');
  const rounded = await sharp(icon).composite([{ input: mask, blend: 'dest-in' }]).png().toBuffer();
  await sharp(Buffer.from(svg)).composite([{ input: rounded, left: 852, top: 110 }]).png().toFile(`public/og-${lang}.png`);
  console.log(`public/og-${lang}.png`);
}

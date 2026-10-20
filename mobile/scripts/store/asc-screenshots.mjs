// App Store Connect：スクリーンショット（store-screenshots/out/appstore/<アプリの言語>/01.png〜）を上げる（Keptly の scripts/store/asc-screenshots.mjs から）
// 先に store-screenshots/（README.md）で画像を書き出しておく
// 対象は、編集できる（まだ審査に出していない）バージョン。その言語の 6.9 インチのスクリーンショットを、すべて入れ替える
// 画像のない言語は触らない（App Store では、主な言語のスクリーンショットが代わりに出る）
// 使い方：pnpm store:asc:screenshots [ja,en] [--dry-run]
import crypto from 'node:crypto';
import fs from 'node:fs';
import { setTimeout as sleep } from 'node:timers/promises';
import { STORE_LOCALES } from './config.mjs';
import { asc, ascAll, editableVersion, must } from './lib.mjs';

// 6.9 インチ（1320×2868）は、API では 6.7 インチと同じ種類として扱われる
const DISPLAY_TYPE = 'APP_IPHONE_67';
const SIZE = { width: 1320, height: 2868 };
const MAX_SCREENSHOTS = 10;
const FINAL_DIR = new URL('../../../store-screenshots/out/appstore/', import.meta.url);

const dryRun = process.argv.includes('--dry-run');
const langArg = process.argv.slice(2).find((a) => !a.startsWith('-'));
const langs = langArg
  ? langArg.split(',')
  : Object.keys(STORE_LOCALES).filter((lang) => fs.existsSync(new URL(`${lang}/`, FINAL_DIR)));
if (!langs.length) throw new Error('画像がない。先に store-screenshots/ で書き出す');

/** PNG の幅と高さ（IHDR） */
function pngSize(buf) {
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

/** 言語ごとの画像。01.png, 02.png … の順 */
function imagesFor(lang) {
  if (!STORE_LOCALES[lang]) throw new Error(`対応していない言語: ${lang}`);
  const dir = new URL(`${lang}/`, FINAL_DIR);
  const files = fs.existsSync(dir)
    ? fs
        .readdirSync(dir)
        .filter((f) => /^\d+\.png$/.test(f))
        .sort((a, b) => parseInt(a) - parseInt(b))
    : [];
  if (!files.length) throw new Error(`${lang} の画像がない`);
  if (files.length > MAX_SCREENSHOTS) throw new Error(`${lang} の画像が多すぎる（${files.length} / ${MAX_SCREENSHOTS}）`);
  return files.map((name) => {
    const data = fs.readFileSync(new URL(name, dir));
    const size = pngSize(data);
    if (size.width !== SIZE.width || size.height !== SIZE.height) {
      throw new Error(`${lang}/${name} の大きさが違う（${size.width}×${size.height}）`);
    }
    return { name, data };
  });
}

const images = Object.fromEntries(langs.map((lang) => [lang, imagesFor(lang)]));

const version = await editableVersion();
const versionLocs = await ascAll(`/v1/appStoreVersions/${version.id}/appStoreVersionLocalizations?limit=50`);
console.log('version', version.attributes.versionString, dryRun ? '(dry run)' : '');

async function upload(setId, { name, data }) {
  const created = must(
    `appScreenshots ${name}`,
    await asc('/v1/appScreenshots', {
      method: 'POST',
      body: {
        data: {
          type: 'appScreenshots',
          attributes: { fileName: name, fileSize: data.length },
          relationships: { appScreenshotSet: { data: { type: 'appScreenshotSets', id: setId } } },
        },
      },
    })
  ).data;
  for (const op of created.attributes.uploadOperations) {
    const headers = Object.fromEntries(op.requestHeaders.map((h) => [h.name, h.value]));
    const r = await fetch(op.url, { method: op.method, headers, body: data.subarray(op.offset, op.offset + op.length) });
    if (!r.ok) throw new Error(`upload ${name} ${r.status}`);
  }
  must(
    `commit ${name}`,
    await asc(`/v1/appScreenshots/${created.id}`, {
      method: 'PATCH',
      body: {
        data: {
          type: 'appScreenshots',
          id: created.id,
          attributes: { uploaded: true, sourceFileChecksum: crypto.createHash('md5').update(data).digest('hex') },
        },
      },
    })
  );
  return created.id;
}

/** Apple 側の処理が終わるのを待つ。失敗したら止める */
async function waitProcessed(ids) {
  for (let i = 0; i < 60; i++) {
    const states = await Promise.all(
      ids.map(async (id) => must(`appScreenshot ${id}`, await asc(`/v1/appScreenshots/${id}`)).data.attributes.assetDeliveryState)
    );
    const failed = states.find((s) => s?.state === 'FAILED');
    if (failed) throw new Error(`処理に失敗した：${JSON.stringify(failed.errors)}`);
    if (states.every((s) => s?.state === 'COMPLETE')) return;
    await sleep(3000);
  }
  throw new Error('処理が終わらない（App Store Connect の画面で確かめる）');
}

for (const lang of langs) {
  for (const locale of STORE_LOCALES[lang]) {
    const loc = versionLocs.find((l) => l.attributes.locale === locale);
    if (!loc) {
      console.log('skip', locale, '（バージョンにこの言語がない。先に pnpm store:asc:listing）');
      continue;
    }
    const sets = await ascAll(`/v1/appStoreVersionLocalizations/${loc.id}/appScreenshotSets?limit=50`);
    let set = sets.find((s) => s.attributes.screenshotDisplayType === DISPLAY_TYPE);
    const old = set ? await ascAll(`/v1/appScreenshotSets/${set.id}/appScreenshots?limit=50`) : [];
    console.log(locale, `今 ${old.length} 枚 → ${images[lang].length} 枚`);
    if (dryRun) continue;

    if (!set) {
      set = must(
        `appScreenshotSets ${locale}`,
        await asc('/v1/appScreenshotSets', {
          method: 'POST',
          body: {
            data: {
              type: 'appScreenshotSets',
              attributes: { screenshotDisplayType: DISPLAY_TYPE },
              relationships: { appStoreVersionLocalization: { data: { type: 'appStoreVersionLocalizations', id: loc.id } } },
            },
          },
        })
      ).data;
    }
    for (const s of old) must(`delete ${s.id}`, await asc(`/v1/appScreenshots/${s.id}`, { method: 'DELETE' }));
    // 作った順に並ぶので、1枚ずつ順に上げる
    const ids = [];
    for (const image of images[lang]) ids.push(await upload(set.id, image));
    await waitProcessed(ids);
    console.log('screenshots', locale, 'ok');
  }
}

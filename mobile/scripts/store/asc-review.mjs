// App Store Connect：課金の審査用スクリーンショット（Pro の画面）を、3つの商品に入れる（Keptly の scripts/store/asc-review.mjs から）
// 画像は config.mjs の REVIEW_SCREENSHOT。審査メモは asc-version.mjs が入れる
// 同じ画像なら送らない。画像が変わったときだけ入れ替える
// 使い方：pnpm store:asc:review [--dry-run]
import crypto from 'node:crypto';
import fs from 'node:fs';
import { setTimeout as sleep } from 'node:timers/promises';
import { ASC_APP_ID as APP, PRODUCTS, REVIEW_SCREENSHOT } from './config.mjs';
import { asc, ascAll, must } from './lib.mjs';

const dryRun = process.argv.includes('--dry-run');
const shotFile = new URL(REVIEW_SCREENSHOT, import.meta.url);
if (!fs.existsSync(shotFile)) throw new Error('審査用の画像がない（config.mjs の REVIEW_SCREENSHOT）');
const shot = { name: 'pro.png', data: fs.readFileSync(shotFile) };
const checksum = crypto.createHash('md5').update(shot.data).digest('hex');

const subs = [];
for (const g of await ascAll(`/v1/apps/${APP}/subscriptionGroups?limit=50`)) subs.push(...(await ascAll(`/v1/subscriptionGroups/${g.id}/subscriptions?limit=50`)));
const iaps = await ascAll(`/v1/apps/${APP}/inAppPurchasesV2?limit=50`);

/** Apple 側の処理が終わるのを待つ */
async function waitProcessed(path) {
  for (let i = 0; i < 60; i++) {
    const state = must(path, await asc(path)).data.attributes.assetDeliveryState?.state;
    if (state === 'FAILED') throw new Error(`処理に失敗した：${path}`);
    if (state === 'COMPLETE') return;
    await sleep(3000);
  }
  throw new Error('処理が終わらない（App Store Connect の画面で確かめる）');
}

async function upload(type, relationship, owner) {
  const created = must(
    `${type} create`,
    await asc(`/v1/${type}`, {
      method: 'POST',
      body: { data: { type, attributes: { fileName: shot.name, fileSize: shot.data.length }, relationships: { [relationship]: { data: owner } } } },
    })
  ).data;
  for (const op of created.attributes.uploadOperations) {
    const headers = Object.fromEntries(op.requestHeaders.map((h) => [h.name, h.value]));
    const r = await fetch(op.url, { method: op.method, headers, body: shot.data.subarray(op.offset, op.offset + op.length) });
    if (!r.ok) throw new Error(`upload ${r.status}`);
  }
  must(`${type} commit`, await asc(`/v1/${type}/${created.id}`, { method: 'PATCH', body: { data: { type, id: created.id, attributes: { uploaded: true, sourceFileChecksum: checksum } } } }));
  await waitProcessed(`/v1/${type}/${created.id}`);
}

for (const p of PRODUCTS) {
  const isSub = p.kind === 'subscription';
  const item = (isSub ? subs : iaps).find((x) => x.attributes.productId === p.productId);
  if (!item) throw new Error(`${p.productId} がない。先に pnpm store:asc:iap`);
  const type = isSub ? 'subscriptionAppStoreReviewScreenshots' : 'inAppPurchaseAppStoreReviewScreenshots';
  const current = must(`${p.key} screenshot`, await asc(isSub ? `/v1/subscriptions/${item.id}/appStoreReviewScreenshot` : `/v2/inAppPurchases/${item.id}/appStoreReviewScreenshot`)).data;
  if (current?.attributes.sourceFileChecksum === checksum) {
    console.log(p.key, 'screenshot ok');
    continue;
  }
  console.log(p.key, 'screenshot', current ? '入れ替え' : '新しく', dryRun ? '(dry run)' : '');
  if (dryRun) continue;
  if (current) must(`${p.key} screenshot delete`, await asc(`/v1/${type}/${current.id}`, { method: 'DELETE' }));
  await upload(type, isSub ? 'subscription' : 'inAppPurchaseV2', { type: isSub ? 'subscriptions' : 'inAppPurchases', id: item.id });
  console.log(p.key, 'screenshot ok');
}

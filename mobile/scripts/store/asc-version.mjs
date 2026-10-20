// App Store Connect：編集できるバージョンの設定（著作権、公開の方法）と、審査へのメモ（アプリと課金ごと）（Keptly の scripts/store/asc-version.mjs から）
// 文は config.mjs の COPYRIGHT・RELEASE_TYPE・REVIEW_NOTES。同じなら送らない
// 課金の審査用スクリーンショットは asc-review.mjs
import fs from 'node:fs';
import { COPYRIGHT, PRODUCTS, RELEASE_TYPE, REVIEW_NOTES } from './config.mjs';
import { asc, ascAll, ascAppId, editableVersion, must } from './lib.mjs';

const APP = ascAppId();
const patch = async (label, path, type, id, attributes) => {
  must(label, await asc(path, { method: 'PATCH', body: { data: { type, id, attributes } } }));
  console.log(label, 'updated');
};

const version = await editableVersion();

// 著作権と公開の方法
const v = version.attributes;
if (v.copyright === COPYRIGHT && v.releaseType === RELEASE_TYPE) console.log('version settings ok');
else
  await patch('version settings', `/v1/appStoreVersions/${version.id}`, 'appStoreVersions', version.id, {
    copyright: COPYRIGHT,
    releaseType: RELEASE_TYPE,
  });

// アプリの審査へのメモ（連絡先は asc-contact.mjs で先に作る）
const detail = must('appStoreReviewDetail', await asc(`/v1/appStoreVersions/${version.id}/appStoreReviewDetail`)).data;
if (!detail) throw new Error('審査の連絡先がまだない（先に pnpm store:asc:contact）');
if (detail.attributes.notes === REVIEW_NOTES.app) console.log('app notes ok');
else await patch('app notes', `/v1/appStoreReviewDetails/${detail.id}`, 'appStoreReviewDetails', detail.id, { notes: REVIEW_NOTES.app });

// 課金ごとの審査メモ
const pro = JSON.parse(fs.readFileSync(new URL('../../src/lib/i18n/locales/en.json', import.meta.url), 'utf8')).pro;
const subs = [];
for (const g of await ascAll(`/v1/apps/${APP}/subscriptionGroups?limit=50`)) subs.push(...(await ascAll(`/v1/subscriptionGroups/${g.id}/subscriptions?limit=50`)));
const iaps = await ascAll(`/v1/apps/${APP}/inAppPurchasesV2?limit=50`);
for (const p of PRODUCTS) {
  const note = REVIEW_NOTES.product.replace('{label}', pro[p.labelKey]);
  if (p.kind === 'subscription') {
    const s = subs.find((x) => x.attributes.productId === p.productId);
    if (!s) throw new Error(`サブスクリプションがない：${p.productId}（先に pnpm store:asc:iap）`);
    if (s.attributes.reviewNote === note) console.log(p.key, 'note ok');
    else await patch(`${p.key} note`, `/v1/subscriptions/${s.id}`, 'subscriptions', s.id, { reviewNote: note });
  } else {
    const i = iaps.find((x) => x.attributes.productId === p.productId);
    if (!i) throw new Error(`買い切りがない：${p.productId}（先に pnpm store:asc:iap）`);
    if (i.attributes.reviewNote === note) console.log(p.key, 'note ok');
    else await patch(`${p.key} note`, `/v2/inAppPurchases/${i.id}`, 'inAppPurchases', i.id, { reviewNote: note });
  }
}

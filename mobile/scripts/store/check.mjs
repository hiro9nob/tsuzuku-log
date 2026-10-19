// App Store Connect と RevenueCat の今の設定を一覧で出す（読むだけ。何も変えない）
// 片方のキーがなくても、もう片方は出す
import { APP_VERSION, ASC_APP_ID, BUNDLE_ID, PRODUCTS } from './config.mjs';
import { asc, ascAll, must, rc } from './lib.mjs';

// 価格を見せる国：config.mjs で手で決めた国（日本とアメリカ、物価に合わせて下げる国）
const MANUAL_TERRITORIES = [...new Set(PRODUCTS.flatMap((p) => Object.keys({ ...p.prices, ...p.localPrices })))].join(',');

async function section(title, fn) {
  console.log(`## ${title}`);
  try {
    await fn();
  } catch (e) {
    console.log('  確かめられない：', e.message);
    process.exitCode = 1;
  }
  console.log('');
}

await section('App Store Connect', async () => {
  const ids = must('bundleIds', await asc(`/v1/bundleIds?filter[identifier]=${BUNDLE_ID},${BUNDLE_ID}.dev&limit=10`)).data;
  console.log('bundle ids:', ids.map((b) => `${b.attributes.identifier} (${b.attributes.platform})`).join(', ') || 'なし');

  const found = must('apps', await asc(`/v1/apps?filter[bundleId]=${BUNDLE_ID}&limit=1`)).data[0];
  if (!ASC_APP_ID) {
    console.log(found ? `アプリの枠：あり（ID ${found.id}）。config.mjs の ASC_APP_ID に入れる` : 'アプリの枠：まだない（docs/store-setup.md）');
    return;
  }
  if (found && found.id !== ASC_APP_ID) console.log(`注意：config.mjs の ASC_APP_ID（${ASC_APP_ID}）と、${BUNDLE_ID} のアプリ（${found.id}）が違う`);
  const APP = ASC_APP_ID;

  const app = must('app', await asc(`/v1/apps/${APP}?fields[apps]=name,bundleId,primaryLocale,contentRightsDeclaration,subscriptionStatusUrlVersion,subscriptionStatusUrlVersionForSandbox`)).data.attributes;
  console.log(app.name, app.bundleId, app.primaryLocale, app.contentRightsDeclaration ?? '-');
  console.log('server notifications:', app.subscriptionStatusUrlVersion ?? '-', '/ sandbox', app.subscriptionStatusUrlVersionForSandbox ?? '-');
  const versions = must('versions', await asc(`/v1/apps/${APP}/appStoreVersions?filter[platform]=IOS&limit=5`)).data;
  for (const v of versions) {
    const a = v.attributes;
    console.log(`version: ${a.versionString}${a.versionString === APP_VERSION ? '（対象）' : ''}`, a.appStoreState, 'copyright:', a.copyright ?? '-', 'release:', a.releaseType ?? '-');
  }
  if (!versions.some((v) => v.attributes.versionString === APP_VERSION)) console.log(`対象のバージョン ${APP_VERSION} がない`);
  const info = must('appInfos', await asc(`/v1/apps/${APP}/appInfos`)).data[0];
  const category = async (r) => (await asc(`/v1/appInfos/${info.id}/${r}`)).json?.data?.id ?? '-';
  console.log('category:', await category('primaryCategory'), '/', await category('secondaryCategory'), 'age rating:', info.attributes.appStoreAgeRating ?? '-');
  const territories = (await asc(`/v1/apps/${APP}/appAvailabilityV2`)).json?.data;
  console.log('available in new territories:', territories?.attributes?.availableInNewTerritories ?? '-');

  for (const g of await ascAll(`/v1/apps/${APP}/subscriptionGroups?limit=50`)) {
    console.log('subscription group:', g.attributes.referenceName, g.id);
    for (const s of await ascAll(`/v1/subscriptionGroups/${g.id}/subscriptions?limit=50`)) {
      const r = must('prices', await asc(`/v1/subscriptions/${s.id}/prices?include=subscriptionPricePoint,territory&filter[territory]=${MANUAL_TERRITORIES}&limit=50`));
      const point = Object.fromEntries((r.included ?? []).filter((i) => i.type === 'subscriptionPricePoints').map((i) => [i.id, i.attributes.customerPrice]));
      const prices = r.data.map((x) => `${x.relationships.territory.data.id}=${point[x.relationships.subscriptionPricePoint.data.id]}`).join(' ');
      console.log(`  ${s.attributes.productId}`, s.id, s.attributes.state, prices || '価格なし');
    }
  }
  for (const i of await ascAll(`/v1/apps/${APP}/inAppPurchasesV2?limit=50`)) {
    const r = must('iap prices', await asc(`/v1/inAppPurchasePriceSchedules/${i.id}/manualPrices?include=inAppPurchasePricePoint&limit=50`));
    const prices = (r.included ?? []).filter((x) => x.type === 'inAppPurchasePricePoints').map((x) => x.attributes.customerPrice).join(' ');
    console.log(`  ${i.attributes.productId}`, i.id, i.attributes.state, prices || '価格なし');
  }
});

await section('RevenueCat', async () => {
  const items = async (path) => must(path, await rc(path)).items;
  const apps = Object.fromEntries((await items('/apps?limit=100')).map((a) => [a.id, a.type]));
  console.log('apps:', Object.values(apps).join(', ') || 'なし');
  const label = (p) => `${apps[p.app_id]}:${p.store_identifier}`;
  for (const e of await items('/entitlements?limit=100'))
    console.log('entitlement', e.lookup_key, '->', (await items(`/entitlements/${e.id}/products?limit=100`)).map(label).join(', '));
  for (const o of await items('/offerings?limit=100')) {
    console.log('offering', o.lookup_key, o.is_current ? '(current)' : '');
    for (const p of await items(`/offerings/${o.id}/packages?limit=100`))
      console.log('  ', p.lookup_key, '->', (await items(`/packages/${p.id}/products?limit=100`)).map((x) => label(x.product)).join(', '));
  }
});

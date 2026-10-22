// App Store Connect：Ongo Pro の課金アイテム（サブスクリプションのグループ、月額・年額、買い切り）（Keptly の scripts/store/asc-iap.mjs から）
// 表示名・説明・価格・配信する国まで作る。あるものは作らない。表示名・説明・価格が違えば直す。STORE_LOCALES にない言語は消す
import fs from 'node:fs';
import { IAP_DESCRIPTIONS, PLAN_NAME, PRODUCTS, STORE_LOCALES, SUBSCRIPTION_GROUP } from './config.mjs';
import { asc, ascAll, ascAppId, must } from './lib.mjs';

const APP = ascAppId();
/** アプリの訳（src/lib/i18n/locales/*.json） */
const appLocale = (lang) => JSON.parse(fs.readFileSync(new URL(`../../src/lib/i18n/locales/${lang}.json`, import.meta.url), 'utf8'));

const post = (label, type, attributes, relationships) =>
  asc(`/${type === 'inAppPurchases' ? 'v2' : 'v1'}/${type}`, { method: 'POST', body: { data: { type, attributes, relationships } } }).then(
    (r) => must(label, r).data
  );
const rel = (type, id) => ({ data: { type, id } });

// 表示名（最大35文字）はアプリの pro.* の訳、説明（最大55文字）は config.mjs の IAP_DESCRIPTIONS
const WIDE = ['ja', 'zh-CN', 'zh-TW'];
const texts = Object.fromEntries(
  Object.keys(STORE_LOCALES).map((lang) => {
    const pro = appLocale(lang).pro;
    const name = (label) => (WIDE.includes(lang) ? `${PLAN_NAME}（${label}）` : `${PLAN_NAME} (${label})`);
    const names = Object.fromEntries(
      // かっこが二重になる訳（「平生 이용(1회 구매)」など）は、かっこの前だけを使う
      PRODUCTS.map((p) => [p.key, name(pro[p.labelKey].replace(/\s*[（(].*$/, ''))])
    );
    for (const [k, v] of Object.entries(names)) if (v.length > 35) throw new Error(`表示名が長すぎる：${lang} ${k} ${v}`);
    const description = IAP_DESCRIPTIONS[lang];
    if (!description || [...description].length > 55) throw new Error(`説明がないか長すぎる：${lang}`);
    return [lang, { names, description }];
  })
);
/** STORE_LOCALES にない言語を消す */
async function removeLocalizations(label, type, have) {
  for (const cur of have.filter((x) => !wantedLocales.has(x.attributes.locale))) {
    must(`${label} ${cur.attributes.locale} delete`, await asc(`/v1/${type}/${cur.id}`, { method: 'DELETE' }));
    console.log(`${label} ${cur.attributes.locale}`, 'deleted');
  }
}
/** 言語ごとの表示名と説明。なければ作り、違えば直す。STORE_LOCALES にない言語は消す */
async function upsertLocalizations(label, type, listPath, attrsFor, relationships) {
  const have = await ascAll(listPath);
  await removeLocalizations(label, type, have);
  for (const [lang, locale] of eachLocale()) {
    const attrs = attrsFor(lang);
    const cur = have.find((x) => x.attributes.locale === locale);
    if (!cur) await post(`${label} ${locale}`, type, { locale, ...attrs }, relationships);
    else if (cur.attributes.name !== attrs.name || cur.attributes.description !== attrs.description)
      must(`${label} ${locale}`, await asc(`/v1/${type}/${cur.id}`, { method: 'PATCH', body: { data: { type, id: cur.id, attributes: attrs } } }));
    else continue;
    console.log(`${label} ${locale}`, 'ok');
  }
}
const eachLocale = function* () {
  for (const [lang, locales] of Object.entries(STORE_LOCALES)) for (const locale of locales) yield [lang, locale];
};
const wantedLocales = new Set(Object.values(STORE_LOCALES).flat());

const territories = (await ascAll('/v1/territories?limit=200')).map((t) => ({ type: 'territories', id: t.id }));
const pickPoint = (points, territory, price) => {
  const p = points.find((x) => x.relationships?.territory?.data?.id === territory && x.attributes.customerPrice === price);
  if (!p) throw new Error(`価格ポイントがない：${territory} ${price}`);
  return p;
};

// 1. サブスクリプションのグループ。名前を変えても別のグループを作らないよう、先に既存の商品の入ったグループを探す
const groups = await ascAll(`/v1/apps/${APP}/subscriptionGroups?limit=50`);
const productIds = new Set(PRODUCTS.map((p) => p.productId));
let group = groups.find((g) => g.attributes.referenceName === SUBSCRIPTION_GROUP);
if (!group)
  for (const g of groups)
    if ((await ascAll(`/v1/subscriptionGroups/${g.id}/subscriptions?limit=50`)).some((x) => productIds.has(x.attributes.productId))) {
      group = g;
      break;
    }
group ??= await post('group', 'subscriptionGroups', { referenceName: SUBSCRIPTION_GROUP }, { app: rel('apps', APP) });
const groupLocs = await ascAll(`/v1/subscriptionGroups/${group.id}/subscriptionGroupLocalizations?limit=50`);
await removeLocalizations('group', 'subscriptionGroupLocalizations', groupLocs);
const groupLocales = groupLocs.map((x) => x.attributes.locale);
for (const [, locale] of eachLocale())
  if (!groupLocales.includes(locale))
    await post(`group ${locale}`, 'subscriptionGroupLocalizations', { locale, name: SUBSCRIPTION_GROUP }, { subscriptionGroup: rel('subscriptionGroups', group.id) });
console.log('group', group.id);

// 2. 月額・年額
const subs = await ascAll(`/v1/subscriptionGroups/${group.id}/subscriptions?limit=50`);
for (const p of PRODUCTS.filter((x) => x.kind === 'subscription')) {
  const sub =
    subs.find((x) => x.attributes.productId === p.productId) ??
    (await post(
      p.key,
      'subscriptions',
      { name: p.referenceName, productId: p.productId, subscriptionPeriod: p.period, familySharable: false },
      { group: rel('subscriptionGroups', group.id) }
    ));
  await upsertLocalizations(
    p.key,
    'subscriptionLocalizations',
    `/v1/subscriptions/${sub.id}/subscriptionLocalizations?limit=50`,
    (lang) => ({ name: texts[lang].names[p.key], description: texts[lang].description }),
    { subscription: rel('subscriptions', sub.id) }
  );

  const availability = await asc(`/v1/subscriptions/${sub.id}/subscriptionAvailability`);
  if (availability.status !== 200 || !availability.json?.data)
    await post(
      `${p.key} availability`,
      'subscriptionAvailabilities',
      { availableInNewTerritories: true },
      { subscription: rel('subscriptions', sub.id), availableTerritories: { data: territories } }
    );

  // 価格：日本の価格から換算した全地域の価格（plan）と、今の価格を地域ごとに比べ、違う地域だけ登録する
  // （途中で失敗しても、流し直せば残りが入る）
  const jp = pickPoint(await ascAll(`/v1/subscriptions/${sub.id}/pricePoints?filter[territory]=JPN&include=territory&limit=200`), 'JPN', p.prices.JPN);
  const us = pickPoint(await ascAll(`/v1/subscriptions/${sub.id}/pricePoints?filter[territory]=USA&include=territory&limit=200`), 'USA', p.prices.USA);
  const equalized = await ascAll(`/v1/subscriptionPricePoints/${jp.id}/equalizations?include=territory&limit=200`);
  const plan = [
    ['JPN', jp.id],
    ['USA', us.id],
    ...equalized.map((x) => [x.relationships.territory.data.id, x.id]).filter(([t]) => t !== 'JPN' && t !== 'USA'),
  ];
  // 予約した将来の価格（startDate が先）は、今の価格として数えない
  const today = new Date().toISOString().slice(0, 10);
  const currentPoint = {};
  for (const x of await ascAll(`/v1/subscriptions/${sub.id}/prices?include=subscriptionPricePoint,territory&limit=200`)) {
    const start = x.attributes.startDate;
    if (start && start > today) continue;
    const t = x.relationships.territory.data.id;
    const prev = currentPoint[t];
    if (!prev || (start ?? '') >= (prev.start ?? '')) currentPoint[t] = { point: x.relationships.subscriptionPricePoint.data.id, start };
  }
  const todo = plan.filter(([t, point]) => currentPoint[t]?.point !== point);
  for (const [territory, point] of todo)
    await post(`${p.key} price ${territory}`, 'subscriptionPrices', { preserveCurrentPrice: false }, {
      subscription: rel('subscriptions', sub.id),
      subscriptionPricePoint: rel('subscriptionPricePoints', point),
      territory: rel('territories', territory),
    });
  console.log(p.key, sub.id, todo.length ? `prices set: ${todo.length}/${plan.length}` : 'prices ok');
}

// 3. 買い切り（非消耗型）。いくつあっても1つずつ扱う
const iaps = await ascAll(`/v1/apps/${APP}/inAppPurchasesV2?limit=50`);
for (const product of PRODUCTS.filter((x) => x.kind === 'nonConsumable')) {
  const iap =
    iaps.find((x) => x.attributes.productId === product.productId) ??
    (await post(
      product.key,
      'inAppPurchases',
      { name: product.referenceName, productId: product.productId, inAppPurchaseType: 'NON_CONSUMABLE', familySharable: false },
      { app: rel('apps', APP) }
    ));
  await upsertLocalizations(
    product.key,
    'inAppPurchaseLocalizations',
    `/v2/inAppPurchases/${iap.id}/inAppPurchaseLocalizations?limit=50`,
    (lang) => ({ name: texts[lang].names[product.key], description: texts[lang].description }),
    { inAppPurchaseV2: rel('inAppPurchases', iap.id) }
  );
  const iapAvailability = await asc(`/v2/inAppPurchases/${iap.id}/inAppPurchaseAvailability`);
  if (iapAvailability.status !== 200 || !iapAvailability.json?.data)
    await post(
      `${product.key} availability`,
      'inAppPurchaseAvailabilities',
      { availableInNewTerritories: true },
      { inAppPurchase: rel('inAppPurchases', iap.id), availableTerritories: { data: territories } }
    );

  // 手動の価格を、地域ごとに今の価格（startDate が今日以前）で比べる。
  // 新しい商品には、価格の入っていない既定のスケジュール（基準はアメリカ）があるので、中身で判断する
  const manual = must(
    `${product.key} prices`,
    await asc(`/v1/inAppPurchasePriceSchedules/${iap.id}/manualPrices?include=inAppPurchasePricePoint,territory&limit=50`)
  );
  const today = new Date().toISOString().slice(0, 10);
  const pointPrice = Object.fromEntries(
    (manual.included ?? []).filter((i) => i.type === 'inAppPurchasePricePoints').map((i) => [i.id, i.attributes.customerPrice])
  );
  const nowPrice = {};
  for (const x of manual.data ?? []) {
    const start = x.attributes?.startDate;
    if (start && start > today) continue;
    const t = x.relationships?.territory?.data?.id;
    const pt = x.relationships?.inAppPurchasePricePoint?.data?.id;
    if (t && pt) nowPrice[t] = pointPrice[pt];
  }
  if (nowPrice.JPN === product.prices.JPN && nowPrice.USA === product.prices.USA) {
    console.log(product.key, iap.id, 'prices ok');
    continue;
  }
  const points = await ascAll(`/v2/inAppPurchases/${iap.id}/pricePoints?filter[territory]=JPN,USA&include=territory&limit=200`);
  const jp = pickPoint(points, 'JPN', product.prices.JPN);
  const us = pickPoint(points, 'USA', product.prices.USA);
  const price = (id, point) => ({
    type: 'inAppPurchasePrices',
    id,
    attributes: { startDate: null },
    relationships: { inAppPurchasePricePoint: rel('inAppPurchasePricePoints', point.id) },
  });
  must(
    `${product.key} price schedule`,
    await asc('/v1/inAppPurchasePriceSchedules', {
      method: 'POST',
      body: {
        data: {
          type: 'inAppPurchasePriceSchedules',
          relationships: {
            inAppPurchase: rel('inAppPurchases', iap.id),
            baseTerritory: rel('territories', 'JPN'),
            manualPrices: { data: [{ type: 'inAppPurchasePrices', id: '${jp}' }, { type: 'inAppPurchasePrices', id: '${us}' }] },
          },
        },
        included: [price('${jp}', jp), price('${us}', us)],
      },
    })
  );
  console.log(product.key, iap.id, 'prices set');
}

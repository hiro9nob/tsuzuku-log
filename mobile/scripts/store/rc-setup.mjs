// RevenueCat：iOS アプリ（本番）、商品、権利 pro、Offering default とパッケージ（docs/revenuecat-setup.md）
// あるものは作らない。Offering は current にする。鍵の中身は表示しない
// 権利とパッケージには Test Store の商品も結びつける（あれば。開発で購入を試すため）
// App Store Connect のアプリ ID は使わない（アプリの枠より先に流してもよい。商品はストア側にまだなくても登録できる）
import fs from 'node:fs';
import { BUNDLE_ID, PLAN_NAME, PRODUCTS, RC_APP_NAME, RC_ENTITLEMENT, RC_OFFERING } from './config.mjs';
import { env, envPath, must, rc } from './lib.mjs';

const list = async (path) => must(path, await rc(path)).items;
const create = async (label, path, body) => must(label, await rc(path, { method: 'POST', body }));
// Test Store の商品の期間と通貨（config.mjs の period と prices の国から）
const TEST_STORE_DURATION = { ONE_WEEK: 'P1W', ONE_MONTH: 'P1M', TWO_MONTHS: 'P2M', THREE_MONTHS: 'P3M', SIX_MONTHS: 'P6M', ONE_YEAR: 'P1Y' };
const TEST_STORE_CURRENCY = { JPN: 'JPY', USA: 'USD' };

// 1. iOS アプリ（App 内課金キーと App Store Connect API キー、ベンダー番号も渡す）
let app = (await list('/apps?limit=100')).find((a) => a.type === 'app_store' && a.app_store?.bundle_id === BUNDLE_ID);
if (!app) {
  app = await create('create app', '/apps', {
    name: RC_APP_NAME,
    type: 'app_store',
    app_store: {
      bundle_id: BUNDLE_ID,
      subscription_private_key: fs.readFileSync(envPath('ASC_IAP_KEY_PATH'), 'utf8'),
      subscription_key_id: env('ASC_IAP_KEY_ID'),
      subscription_key_issuer: env('ASC_ISSUER_ID'),
      app_store_connect_api_key: fs.readFileSync(envPath('ASC_KEY_PATH'), 'utf8'),
      app_store_connect_api_key_id: env('ASC_KEY_ID'),
      app_store_connect_api_key_issuer: env('ASC_ISSUER_ID'),
      app_store_connect_vendor_number: env('ASC_VENDOR_NUMBER'),
    },
  });
}
const keys = await list(`/apps/${app.id}/public_api_keys`);
console.log('app', app.id, app.name);
// 公開用の SDK キーは秘密ではない（アプリに入れて commit する）
console.log('  public SDK key (app.config.ts の production の RevenueCat の公開キー):', keys.find((k) => k.environment === 'production')?.key);
const testStore = (await list('/apps?limit=100')).find((a) => a.type === 'test_store');
if (testStore)
  console.log('  Test Store key (app.config.ts の dev):', (await list(`/apps/${testStore.id}/public_api_keys`)).find((k) => k.environment === 'production')?.key);

// 2. App Store の商品
const products = await list('/products?limit=100');
for (const p of PRODUCTS) {
  const prod =
    products.find((x) => x.app_id === app.id && x.store_identifier === p.productId) ??
    (await create(`product ${p.key}`, '/products', {
      store_identifier: p.productId,
      app_id: app.id,
      type: p.kind === 'subscription' ? 'subscription' : 'non_consumable',
      display_name: p.referenceName,
    }));
  p.rcId = prod.id;
  console.log('product', p.key, p.rcId);
}

// 2b. Test Store の商品（開発で、本物の課金なしに購入を試すため）。期間と価格はあとで変えられない
const testApp = (await list('/apps?limit=100')).find((a) => a.type === 'test_store');
for (const p of PRODUCTS) {
  if (!testApp || !p.testStoreId) continue;
  let prod = products.find((x) => x.app_id === testApp.id && x.store_identifier === p.testStoreId);
  if (!prod) {
    prod = await create(`test store product ${p.key}`, '/products', {
      store_identifier: p.testStoreId,
      app_id: testApp.id,
      type: p.kind === 'subscription' ? 'subscription' : 'non_consumable',
      display_name: `${p.referenceName} (Test Store)`,
      title: `${PLAN_NAME} ${p.reviewLabel}`,
      ...(p.kind === 'subscription' ? { subscription: { duration: TEST_STORE_DURATION[p.period] } } : {}),
    });
  }
  const prices = must(`test store prices ${p.key}`, await rc(`/products/${prod.id}/test_store_prices`)) ?? [];
  if (!prices.length) {
    await create(`test store prices ${p.key}`, `/products/${prod.id}/test_store_prices`, {
      prices: Object.entries(p.prices).map(([territory, amount]) => ({ amount_micros: Math.round(Number(amount) * 1e6), currency: TEST_STORE_CURRENCY[territory] })),
    });
  }
  p.rcTestId = prod.id;
  console.log('test store product', p.key, p.rcTestId);
}

// 3. 権利 pro
const entitlement =
  (await list('/entitlements?limit=100')).find((e) => e.lookup_key === RC_ENTITLEMENT) ??
  (await create('entitlement', '/entitlements', { lookup_key: RC_ENTITLEMENT, display_name: PLAN_NAME }));
const attached = (await list(`/entitlements/${entitlement.id}/products?limit=100`)).map((x) => x.id);
const toAttach = PRODUCTS.flatMap((p) => [p.rcId, p.rcTestId]).filter((id) => id && !attached.includes(id));
if (toAttach.length) await create('attach entitlement', `/entitlements/${entitlement.id}/actions/attach_products`, { product_ids: toAttach });
console.log('entitlement', RC_ENTITLEMENT, entitlement.id, 'attached +', toAttach.length);

// 4. Offering default（なければ作り、current にする）
const offering =
  (await list('/offerings?limit=100')).find((o) => o.lookup_key === RC_OFFERING) ??
  (await create('offering', '/offerings', { lookup_key: RC_OFFERING, display_name: PLAN_NAME }));
if (!offering.is_current) await create('offering current', `/offerings/${offering.id}`, { is_current: true });
console.log('offering', RC_OFFERING, offering.id, 'current');

// 5. パッケージ（なければ作る）に商品を入れる
const packages = await list(`/offerings/${offering.id}/packages?limit=100`);
for (const [i, p] of PRODUCTS.entries()) {
  const pkg =
    packages.find((x) => x.lookup_key === p.rcPackage) ??
    (await create(`package ${p.rcPackage}`, `/offerings/${offering.id}/packages`, { lookup_key: p.rcPackage, display_name: p.referenceName, position: i + 1 }));
  const have = (await list(`/packages/${pkg.id}/products?limit=100`)).map((x) => x.product?.id);
  const add = [p.rcId, p.rcTestId].filter((id) => id && !have.includes(id));
  if (add.length)
    await create(`attach ${p.rcPackage}`, `/packages/${pkg.id}/actions/attach_products`, {
      products: add.map((product_id) => ({ product_id, eligibility_criteria: 'all' })),
    });
  console.log('package', p.rcPackage, pkg.id, 'attached +', add.length);
}

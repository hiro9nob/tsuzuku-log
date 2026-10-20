// App Store Connect：アプリ全体の設定（価格は無料、配信する国、コンテンツの権利、カテゴリ、年齢制限、プライバシーポリシーの URL）（Keptly の scripts/store/asc-app.mjs から）
// 何度流しても同じ結果になる。著作権の表記と審査用の連絡先はバージョンごとの項目なので、ここでは扱わない
import { AGE_RATING, APP_SETTINGS } from './config.mjs';
import { asc, ascAll, ascAppId, must } from './lib.mjs';

const APP = ascAppId();

const territories = (await ascAll('/v1/territories?limit=200')).map((t) => t.id);

// 価格：無料（基準の国はアメリカ）
const manual = await asc(`/v1/appPriceSchedules/${APP}/manualPrices?include=appPricePoint&limit=50`);
const isFree = manual.json?.included?.some((i) => i.type === 'appPricePoints' && i.attributes.customerPrice === '0.0');
if (!isFree) {
  const points = await ascAll(`/v1/apps/${APP}/appPricePoints?filter[territory]=USA&limit=200`);
  const free = points.find((p) => p.attributes.customerPrice === '0.0');
  must(
    'price',
    await asc('/v1/appPriceSchedules', {
      method: 'POST',
      body: {
        data: {
          type: 'appPriceSchedules',
          relationships: {
            app: { data: { type: 'apps', id: APP } },
            baseTerritory: { data: { type: 'territories', id: 'USA' } },
            manualPrices: { data: [{ type: 'appPrices', id: '${p0}' }] },
          },
        },
        included: [
          { type: 'appPrices', id: '${p0}', relationships: { appPricePoint: { data: { type: 'appPricePoints', id: free.id } } } },
        ],
      },
    }),
  );
}
console.log('price: free');

// 配信する国：すべて＋新しい国も自動で
const availability = await asc(`/v1/apps/${APP}/appAvailabilityV2`);
if (availability.status !== 200) {
  must(
    'availability',
    await asc('/v2/appAvailabilities', {
      method: 'POST',
      body: {
        data: {
          type: 'appAvailabilities',
          attributes: { availableInNewTerritories: true },
          relationships: {
            app: { data: { type: 'apps', id: APP } },
            territoryAvailabilities: { data: territories.map((_, i) => ({ type: 'territoryAvailabilities', id: `\${t${i}}` })) },
          },
        },
        included: territories.map((t, i) => ({
          type: 'territoryAvailabilities',
          id: `\${t${i}}`,
          attributes: { available: true },
          relationships: { territory: { data: { type: 'territories', id: t } } },
        })),
      },
    }),
  );
}
console.log('availability: all territories');

// コンテンツの権利
must(
  'content rights',
  await asc(`/v1/apps/${APP}`, {
    method: 'PATCH',
    body: { data: { type: 'apps', id: APP, attributes: { contentRightsDeclaration: APP_SETTINGS.contentRightsDeclaration } } },
  })
);
console.log('content rights:', APP_SETTINGS.contentRightsDeclaration);

// カテゴリと年齢制限（App 情報）。公開前の App 情報を対象にする
const infos = must('appInfos', await asc(`/v1/apps/${APP}/appInfos`)).data;
const info = infos.find((i) => i.attributes.state !== 'READY_FOR_DISTRIBUTION') ?? infos[0];
must(
  'category',
  await asc(`/v1/appInfos/${info.id}`, {
    method: 'PATCH',
    body: {
      data: {
        type: 'appInfos',
        id: info.id,
        relationships: {
          primaryCategory: { data: { type: 'appCategories', id: APP_SETTINGS.primaryCategory } },
          secondaryCategory: { data: { type: 'appCategories', id: APP_SETTINGS.secondaryCategory } },
        },
      },
    },
  })
);
console.log('category:', APP_SETTINGS.primaryCategory, APP_SETTINGS.secondaryCategory);
must(
  'age rating',
  await asc(`/v1/ageRatingDeclarations/${info.id}`, {
    method: 'PATCH',
    body: { data: { type: 'ageRatingDeclarations', id: info.id, attributes: AGE_RATING } },
  })
);
console.log('age rating: answered');

// プライバシーポリシーの URL（英語（U.S.）。ほかの言語は掲載情報を作るときに入れる）
const locs = must('appInfoLocalizations', await asc(`/v1/appInfos/${info.id}/appInfoLocalizations`)).data;
const en = locs.find((l) => l.attributes.locale === 'en-US');
must(
  'privacy url',
  await asc(`/v1/appInfoLocalizations/${en.id}`, {
    method: 'PATCH',
    body: { data: { type: 'appInfoLocalizations', id: en.id, attributes: { privacyPolicyUrl: APP_SETTINGS.privacyPolicyUrl } } },
  })
);
console.log('privacy policy url:', APP_SETTINGS.privacyPolicyUrl);

// App Store Connect：掲載情報（言語ごとのアプリ名、サブタイトル、説明文、キーワード、プロモーション用テキスト、URL）を config.mjs の STORE_LOCALES の言語で入れる（Keptly の scripts/store/asc-listing.mjs から）
// 文は scripts/store/listing/<アプリの言語>.json。言語がなければ作り、あれば上書きし、STORE_LOCALES にない言語は消す
// 対象は、編集できる（まだ審査に出していない）バージョン
import fs from 'node:fs';
import { STORE_LOCALES } from './config.mjs';
import { asc, ascAll, ascAppId, editableVersion, must } from './lib.mjs';

const APP = ascAppId();

const SITE = 'https://ongo.no9.app';
// サイトは英語と日本語だけ。日本語以外は英語のページにする
const sitePath = (lang, path) => `${SITE}${lang === 'ja' ? '/ja' : ''}${path}`;
const LIMITS = { name: 30, subtitle: 30, promotionalText: 170, keywords: 100, description: 4000 };

const texts = Object.fromEntries(
  Object.keys(STORE_LOCALES).map((lang) => {
    const t = JSON.parse(fs.readFileSync(new URL(`./listing/${lang}.json`, import.meta.url), 'utf8'));
    for (const [k, max] of Object.entries(LIMITS)) {
      const len = [...t[k]].length;
      if (len > max) throw new Error(`${lang} の ${k} が長すぎる（${len} / ${max}）`);
    }
    return [lang, t];
  })
);

const upsert = async (label, type, existing, attributes, relationships) => {
  if (existing) {
    // locale は作ったあと変えられないので送らない
    const { locale: _locale, ...rest } = attributes;
    return must(label, await asc(`/v1/${type}/${existing.id}`, { method: 'PATCH', body: { data: { type, id: existing.id, attributes: rest } } }));
  }
  return must(label, await asc(`/v1/${type}`, { method: 'POST', body: { data: { type, attributes, relationships } } }));
};

// アプリ情報（名前、サブタイトル、プライバシーポリシーの URL）
const infos = must('appInfos', await asc(`/v1/apps/${APP}/appInfos`)).data;
const info = infos.find((i) => i.attributes.state !== 'READY_FOR_DISTRIBUTION') ?? infos[0];
const infoLocs = await ascAll(`/v1/appInfos/${info.id}/appInfoLocalizations?limit=50`);

// バージョン（説明文、キーワード、プロモーション用テキスト、サポートとマーケティングの URL）
const version = await editableVersion();

for (const [lang, locales] of Object.entries(STORE_LOCALES)) {
  const t = texts[lang];
  for (const locale of locales) {
    await upsert(
      `appInfo ${locale}`,
      'appInfoLocalizations',
      infoLocs.find((l) => l.attributes.locale === locale),
      { locale, name: t.name, subtitle: t.subtitle, privacyPolicyUrl: sitePath(lang, '/privacy/') },
      { appInfo: { data: { type: 'appInfos', id: info.id } } }
    );
    // アプリ情報に言語を足すと、バージョンにも同じ言語が自動でできるので、ここで読み直す
    const versionLocs = await ascAll(`/v1/appStoreVersions/${version.id}/appStoreVersionLocalizations?limit=50`);
    await upsert(
      `version ${locale}`,
      'appStoreVersionLocalizations',
      versionLocs.find((l) => l.attributes.locale === locale),
      {
        locale,
        description: t.description,
        keywords: t.keywords,
        promotionalText: t.promotionalText,
        supportUrl: sitePath(lang, '/support/'),
        marketingUrl: sitePath(lang, '/'),
      },
      { appStoreVersion: { data: { type: 'appStoreVersions', id: version.id } } }
    );
    console.log('listing', locale, 'ok');
  }
}

// STORE_LOCALES にない言語を消す（主言語の en-US は消せないので、STORE_LOCALES に残しておく）
const wanted = new Set(Object.values(STORE_LOCALES).flat());
const remove = async (label, type, items) => {
  for (const l of items.filter((x) => !wanted.has(x.attributes.locale))) {
    must(`${label} ${l.attributes.locale} delete`, await asc(`/v1/${type}/${l.id}`, { method: 'DELETE' }));
    console.log(label, l.attributes.locale, 'deleted');
  }
};
await remove('version', 'appStoreVersionLocalizations', await ascAll(`/v1/appStoreVersions/${version.id}/appStoreVersionLocalizations?limit=50`));
await remove('appInfo', 'appInfoLocalizations', await ascAll(`/v1/appInfos/${info.id}/appInfoLocalizations?limit=50`));
console.log('version', version.attributes.versionString);

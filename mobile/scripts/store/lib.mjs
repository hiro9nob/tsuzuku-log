// App Store Connect API と RevenueCat REST API v2 を呼ぶための共通部分（Teraloo の scripts/store/lib.mjs から）
// キーは mobile/.env.local から読む（package.json の store:* が node --env-file で渡す）。値は表示しない
import { Buffer } from 'node:buffer';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';
import { ASC_APP_ID } from './config.mjs';

export function env(name) {
  // Node のスクリプトなので、アプリ向けの規則（EXPO_PUBLIC_ の静的な参照）は当てはまらない
  // eslint-disable-next-line expo/no-dynamic-env-var
  const v = process.env[name];
  if (!v) throw new Error(`${name} が mobile/.env.local にありません`);
  return v;
}

/** ファイルのパスの環境変数。先頭の ~ はホームにする（node --env-file は展開しないため） */
export function envPath(name) {
  const v = env(name);
  return v === '~' || v.startsWith('~/') ? path.join(os.homedir(), v.slice(1)) : v;
}

/** App Store Connect のアプリ ID。まだなければ止める */
export function ascAppId() {
  if (ASC_APP_ID) return ASC_APP_ID;
  console.error('App Store Connect のアプリ ID がまだない。docs/store-setup.md を見て config.mjs の ASC_APP_ID に入れる');
  process.exit(1);
}

/** 失敗したら中身を付けて投げる（スクリプトはそこで止まる。check.mjs は受け止めて続ける） */
export function must(label, res) {
  if (res.status >= 300) {
    const detail = res.json?.errors?.map((e) => `${e.source?.pointer ?? ''} ${e.detail}`) ?? res.json;
    throw new Error(`ERR ${label} ${res.status} ${JSON.stringify(detail)}`);
  }
  return res.json;
}

/** 429 と 5xx は待ってから送り直す（最大5回。Retry-After があれば従う） */
async function request(url, headers, opt = {}) {
  for (let attempt = 0; ; attempt++) {
    const r = await fetch(url, {
      ...opt,
      body: opt.body && JSON.stringify(opt.body),
      headers: { ...headers(), 'Content-Type': 'application/json' },
    });
    const text = await r.text();
    if ((r.status === 429 || r.status >= 500) && attempt < 5) {
      const after = Number(r.headers.get('retry-after'));
      const wait = after > 0 ? after * 1000 : 2000 * 2 ** attempt;
      console.warn(`  ${r.status}。${Math.round(wait / 1000)}秒待って送り直す`);
      await sleep(wait);
      continue;
    }
    let json = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      json = { text };
    }
    return { status: r.status, json };
  }
}

// App Store Connect：.p8 で ES256 の JWT を作る（有効期限は最長20分。15分たったら作り直す）
let token;
let tokenAt = 0;
function ascToken() {
  if (token && Date.now() - tokenAt < 15 * 60 * 1000) return token;
  const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
  const now = Math.floor(Date.now() / 1000);
  const head = b64({ alg: 'ES256', kid: env('ASC_KEY_ID'), typ: 'JWT' });
  const payload = b64({ iss: env('ASC_ISSUER_ID'), iat: now, exp: now + 1200, aud: 'appstoreconnect-v1' });
  const sig = crypto
    .sign('sha256', Buffer.from(`${head}.${payload}`), { key: fs.readFileSync(envPath('ASC_KEY_PATH')), dsaEncoding: 'ieee-p1363' })
    .toString('base64url');
  token = `${head}.${payload}.${sig}`;
  tokenAt = Date.now();
  return token;
}

export function asc(path, opt) {
  ascToken(); // 鍵がなければ、通信の前に止める
  return request(`https://api.appstoreconnect.apple.com${path}`, () => ({ Authorization: `Bearer ${ascToken()}` }), opt);
}

/** ページを最後までたどって data をまとめて返す */
export async function ascAll(path) {
  let out = [];
  let next = path;
  while (next) {
    const r = must(next, await asc(next));
    out = out.concat(r.data);
    next = r.links?.next?.replace('https://api.appstoreconnect.apple.com', '');
  }
  return out;
}

/** 対象のバージョン（config.mjs の APP_VERSION）。なければ止める */
export async function ascVersion(app, versionString) {
  const versions = must(
    'appStoreVersions',
    await asc(`/v1/apps/${app}/appStoreVersions?filter[platform]=IOS&filter[versionString]=${versionString}&limit=1`)
  ).data;
  if (!versions.length) {
    console.error(`バージョン ${versionString} がない。App Store Connect で作るか、今のバージョン番号を ${versionString} に直す（pnpm store:check で今のバージョンを出す）`);
    process.exit(1);
  }
  return versions[0];
}

export function rc(path, opt) {
  const project = env('REVENUECAT_PROJECT_ID');
  const key = env('REVENUECAT_SECRET_API_KEY');
  return request(`https://api.revenuecat.com/v2/projects/${project}${path}`, () => ({ Authorization: `Bearer ${key}` }), opt);
}

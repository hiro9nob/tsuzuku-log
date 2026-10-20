// App Store Connect：本番の Bundle ID を登録する。あるものは作らない（Keptly の scripts/store/asc-bundle.mjs から）
// 登録した Bundle ID は変えられない（docs/development.md「決めたこと」）
import { BUNDLE_IDS } from './config.mjs';
import { asc, ascAll, must } from './lib.mjs';

const have = await ascAll('/v1/bundleIds?filter[platform]=IOS&limit=200');
for (const b of BUNDLE_IDS) {
  const cur = have.find((x) => x.attributes.identifier === b.identifier);
  if (cur) {
    console.log('bundle id', b.identifier, 'exists', cur.id);
    continue;
  }
  const created = must(
    `bundle id ${b.identifier}`,
    await asc('/v1/bundleIds', {
      method: 'POST',
      body: { data: { type: 'bundleIds', attributes: { identifier: b.identifier, name: b.name, platform: 'IOS' } } },
    }),
  ).data;
  console.log('bundle id', b.identifier, 'created', created.id);
}

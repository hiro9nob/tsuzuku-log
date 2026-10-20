// App Store Connect：TestFlight の内部グループ（すべてのビルドを配る）を作り、アカウントの持ち主をテスターに入れる
// 内部テストは審査がいらない。あるものは作らない（docs/common/ios-app-playbook.md「TestFlight と RevenueCat」）
import { asc, ascAll, ascAppId, must } from './lib.mjs';

const APP = ascAppId();
const GROUP = 'Internal';

let group = (await ascAll(`/v1/apps/${APP}/betaGroups?limit=50`)).find((g) => g.attributes.name === GROUP);
if (!group) {
  group = must(
    'betaGroup',
    await asc('/v1/betaGroups', {
      method: 'POST',
      body: {
        data: {
          type: 'betaGroups',
          attributes: { name: GROUP, isInternalGroup: true, hasAccessToAllBuilds: true },
          relationships: { app: { data: { type: 'apps', id: APP } } },
        },
      },
    }),
  ).data;
}
console.log('beta group', GROUP, group.id);

// アカウントの持ち主（内部テスターは App Store Connect のユーザーに限られる）
const owner = (await ascAll('/v1/users?limit=50')).find((u) => u.attributes.roles.includes('ACCOUNT_HOLDER'));
const testers = await ascAll(`/v1/betaGroups/${group.id}/betaTesters?limit=50`);
if (testers.some((t) => t.attributes.email === owner.attributes.username)) {
  console.log('tester: account holder already in the group');
} else {
  must(
    'betaTester',
    await asc('/v1/betaTesters', {
      method: 'POST',
      body: {
        data: {
          type: 'betaTesters',
          attributes: { email: owner.attributes.username, firstName: owner.attributes.firstName, lastName: owner.attributes.lastName },
          relationships: { betaGroups: { data: [{ type: 'betaGroups', id: group.id }] } },
        },
      },
    }),
  );
  console.log('tester: added the account holder');
}

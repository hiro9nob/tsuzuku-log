// App Store Connect：審査の提出（reviewSubmission）を作り、編集できるバージョンを入れる（docs/common/ios-app-playbook.md の段階4）
// 作るだけで、審査には出さない。出すのは --submit（人の承認のあと）
// 課金の最初の審査は API では提出に入れられない（playbook「6. 落とし穴」）。画面の各課金のページで「審査用に追加」をしてから --submit
// 使い方：pnpm store:asc:submit [--submit] [--cancel]
import { asc, ascAll, ascAppId, editableVersion, must } from './lib.mjs';

const APP = ascAppId();
const submit = process.argv.includes('--submit');
const cancel = process.argv.includes('--cancel');
const rel = (type, id) => ({ data: { type, id } });

// まだ出していない提出があればそれを使う
const open = (await ascAll(`/v1/apps/${APP}/reviewSubmissions?filter[platform]=IOS&limit=20`)).filter((s) =>
  ['READY_FOR_REVIEW', 'UNRESOLVED_ISSUES'].includes(s.attributes.state)
);
if (open.length > 1) throw new Error(`出していない提出が ${open.length} 個ある（App Store Connect の画面で確かめる）`);
let submission = open[0];
if (cancel) {
  if (!submission) throw new Error('取り消す提出がない');
  must('cancel', await asc(`/v1/reviewSubmissions/${submission.id}`, { method: 'PATCH', body: { data: { type: 'reviewSubmissions', id: submission.id, attributes: { canceled: true } } } }));
  console.log('submission', submission.id, 'canceled');
  process.exit(0);
}

const kinds = (i) => Object.entries(i.relationships ?? {}).filter(([, r]) => r.data).map(([k, r]) => `${k}:${r.data.id}`).join(' ');
if (submit) {
  // 審査に出す（課金を画面で足したあとは、バージョンが「提出準備完了」になり editableVersion では取れないので、提出物からたどる）
  if (!submission) throw new Error('出す提出がない（先に pnpm store:asc:submit）');
  const items = await ascAll(`/v1/reviewSubmissions/${submission.id}/items?include=appStoreVersion&limit=50`);
  const versionId = items.find((i) => i.relationships?.appStoreVersion?.data)?.relationships.appStoreVersion.data.id;
  if (!versionId) throw new Error('提出にバージョンが入っていない（先に pnpm store:asc:submit）');
  for (const i of items) console.log('item', i.attributes.state, kinds(i));
  must('submit', await asc(`/v1/reviewSubmissions/${submission.id}`, { method: 'PATCH', body: { data: { type: 'reviewSubmissions', id: submission.id, attributes: { submitted: true } } } }));
  const after = must('version', await asc(`/v1/appStoreVersions/${versionId}`)).data.attributes;
  const state = must('submission', await asc(`/v1/reviewSubmissions/${submission.id}`)).data.attributes.state;
  console.log('submitted. version', after.versionString, after.appStoreState, 'submission', state);
  process.exit(0);
}

// 提出を作り、編集できるバージョン（ビルド付き）を入れる
const version = await editableVersion();
const withBuild = must('version', await asc(`/v1/appStoreVersions/${version.id}?include=build`));
const build = withBuild.included?.find((x) => x.type === 'builds');
if (!build) throw new Error(`バージョン ${version.attributes.versionString} にビルドが付いていない（先に pnpm store:asc:testflight か、App Store Connect で付ける）`);
console.log('version', version.attributes.versionString, version.attributes.appStoreState, 'build', build.attributes.version, build.attributes.processingState);
if (!submission) {
  submission = must(
    'create submission',
    await asc('/v1/reviewSubmissions', { method: 'POST', body: { data: { type: 'reviewSubmissions', attributes: { platform: 'IOS' }, relationships: { app: rel('apps', APP) } } } })
  ).data;
  console.log('submission', submission.id, 'created');
}

// バージョンを提出に入れる（まだなければ）
const items = await ascAll(`/v1/reviewSubmissions/${submission.id}/items?include=appStoreVersion&limit=50`);
if (!items.some((i) => i.relationships?.appStoreVersion?.data?.id === version.id)) {
  must(
    'add version',
    await asc('/v1/reviewSubmissionItems', {
      method: 'POST',
      body: { data: { type: 'reviewSubmissionItems', relationships: { reviewSubmission: rel('reviewSubmissions', submission.id), appStoreVersion: rel('appStoreVersions', version.id) } } },
    })
  );
  console.log('item version', version.attributes.versionString, 'added');
}
for (const i of await ascAll(`/v1/reviewSubmissions/${submission.id}/items?include=appStoreVersion&limit=50`)) console.log('item', i.attributes.state, kinds(i));
console.log('submission', submission.id, submission.attributes.state);

console.log('次：App Store Connect の画面で課金（グループ、各サブスクリプション、買い切り）を「審査用に追加」し、人の承認のあと pnpm store:asc:submit --submit');

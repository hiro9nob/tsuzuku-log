// App Store Connect：審査の連絡先（編集できるバージョンの「App Review に関する情報」）（Keptly の scripts/store/asc-contact.mjs から）
// 値は mobile/.env.local の REVIEW_CONTACT_*（リポジトリには書かない）。なければ作り、違えば直す
import { asc, editableVersion, env, must } from './lib.mjs';
const contact = {
  contactFirstName: env('REVIEW_CONTACT_FIRST_NAME'),
  contactLastName: env('REVIEW_CONTACT_LAST_NAME'),
  contactPhone: env('REVIEW_CONTACT_PHONE'),
  contactEmail: env('REVIEW_CONTACT_EMAIL'),
  // ログインはないので、デモ用のアカウントは要らない
  demoAccountRequired: false,
};

const version = await editableVersion();

const detail = (await asc(`/v1/appStoreVersions/${version.id}/appStoreReviewDetail`)).json?.data;
if (!detail) {
  must(
    'review detail',
    await asc('/v1/appStoreReviewDetails', {
      method: 'POST',
      body: {
        data: {
          type: 'appStoreReviewDetails',
          attributes: contact,
          relationships: { appStoreVersion: { data: { type: 'appStoreVersions', id: version.id } } },
        },
      },
    })
  );
  console.log('review contact: created for', version.attributes.versionString);
} else if (Object.entries(contact).some(([k, v]) => detail.attributes[k] !== v)) {
  must(
    'review detail',
    await asc(`/v1/appStoreReviewDetails/${detail.id}`, {
      method: 'PATCH',
      body: { data: { type: 'appStoreReviewDetails', id: detail.id, attributes: contact } },
    })
  );
  console.log('review contact: updated for', version.attributes.versionString);
} else console.log('review contact: ok for', version.attributes.versionString);

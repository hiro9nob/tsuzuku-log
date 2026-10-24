// iCloud バックアップ（iOS）。アプリを閉じたとき、前のバックアップから記録が変わっていれば、
// その日・その端末のバックアップを iCloud Drive に置く（同じ日は上書き）。
// - 記録が空のときは置かない（新しい端末で、戻す前に空のバックアップで上書きしないように）
// - ファイル名に端末の ID を入れる（別の端末のバックアップを上書きしないように）
// 戻すときは、書き出した JSON の取り込みと同じく、今の記録に足す
import AsyncStorage from '@react-native-async-storage/async-storage';

import { OngoICloud, type ICloudFile } from '../../modules/ongo-icloud';

import { buildBackupJson, prepareJson, type PreparedImport } from './backup';
import { dayOf } from './day';
import { listAllHabits } from './habits';
import { useSettings } from './settings';
import { newId, nowIso } from './time';

/** 残すバックアップの数（新しいものから） */
const KEEP = 20;
const PREFIX = 'ongo-';
const DEVICE_KEY = 'ongo.deviceId';
const LAST_CONTENT_KEY = 'ongo.lastICloudBackupContent';

export function iCloudSupported(): boolean {
  return OngoICloud !== null;
}

export async function iCloudAvailable(): Promise<boolean> {
  if (!OngoICloud) return false;
  return OngoICloud.isAvailable().catch(() => false);
}

async function deviceId(): Promise<string> {
  const saved = await AsyncStorage.getItem(DEVICE_KEY).catch(() => null);
  if (saved) return saved;
  const id = newId().slice(0, 8);
  await AsyncStorage.setItem(DEVICE_KEY, id).catch(() => {});
  return id;
}

/** 書き出した時刻を除いた中身（変わったかどうかを比べる） */
function contentOf(json: string): string {
  return json.replace(/"exportedAt": "[^"]*",?/, '');
}

/** 今すぐバックアップする。記録が空なら何もしない（false） */
export async function backupToICloud(): Promise<boolean> {
  if (!OngoICloud) throw new Error('iCloud is not supported');
  if (listAllHabits().length === 0) return false;
  const now = new Date();
  const json = buildBackupJson(now.toISOString());
  await OngoICloud.write(`${PREFIX}${dayOf(now)}-${await deviceId()}.json`, json);
  await AsyncStorage.setItem(LAST_CONTENT_KEY, contentOf(json)).catch(() => {});
  await useSettings.getState().set('lastICloudBackupAt', nowIso());
  // 古いものから消す
  const files = (await OngoICloud.list()).filter((f) => f.name.startsWith(PREFIX)).sort((a, b) => b.modifiedAt - a.modifiedAt);
  for (const f of files.slice(KEEP)) await OngoICloud.remove(f.name);
  return true;
}

/** 自動バックアップ（アプリを閉じたとき）。オンで、前のバックアップから記録が変わっていれば */
export async function autoBackupToICloud(): Promise<void> {
  if (!useSettings.getState().iCloudBackup || !OngoICloud) return;
  if (listAllHabits().length === 0) return;
  if (!(await iCloudAvailable())) return;
  const last = await AsyncStorage.getItem(LAST_CONTENT_KEY).catch(() => null);
  if (last !== null && last === contentOf(buildBackupJson())) {
    // 中身が同じでも、保存先にこの端末のきょうのファイルがなければ保存する（iCloud のアカウントを変えたときなど）
    const name = `${PREFIX}${dayOf(new Date())}-${await deviceId()}.json`;
    const files = await OngoICloud.list().catch(() => []);
    if (files.some((f) => f.name === name)) return;
  }
  await backupToICloud().catch((e) => console.warn('[icloud] backup failed', e));
}

export async function listICloudBackups(): Promise<ICloudFile[]> {
  if (!OngoICloud) return [];
  const files = await OngoICloud.list().catch(() => []);
  return files.filter((f) => f.name.startsWith(PREFIX)).sort((a, b) => b.modifiedAt - a.modifiedAt);
}

export async function prepareICloudRestore(name: string): Promise<PreparedImport> {
  if (!OngoICloud) return { kind: 'invalid' };
  return prepareJson(await OngoICloud.read(name));
}

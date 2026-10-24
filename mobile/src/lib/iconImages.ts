// 自分の画像のアイコン（Pro）。選んだ画像を 256px に縮めて、端末の中に置く（サーバーには送らない）
// iOS は App Group の共有の場所（icons/）に置き、ウィジェットからも読めるようにする（targets/widget/TodayWidget.swift）
// バックアップには含めない。戻したときに画像がなければ、基本のアイコンで表示する
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import Constants from 'expo-constants';
import { Directory, File, Paths } from 'expo-file-system';
import { Platform } from 'react-native';

import { listAllHabits } from './habits';
import { imageIcon, parseIcon } from './icons';
import { newId } from './time';

const SIZE = 256;
const FOLDER = 'icons';

function baseDirectory(): Directory {
  const group: unknown = Constants.expoConfig?.extra?.appGroup;
  if (Platform.OS === 'ios' && typeof group === 'string') {
    try {
      const shared = Paths.appleSharedContainers[group];
      if (shared) return shared;
    } catch {
      // 共有の場所が使えないとき（Expo Go など）は、アプリの場所にする
    }
  }
  return Paths.document;
}

function iconsDirectory(): Directory {
  return new Directory(baseDirectory(), FOLDER);
}

/** 画像のファイルの URI。ファイルがなければ null（バックアップから戻したときなど） */
export function iconImageUri(file: string): string | null {
  try {
    const f = new File(iconsDirectory(), file);
    return f.exists ? f.uri : null;
  } catch {
    return null;
  }
}

/** 写真から選んで、正方形に切り取り、縮めて保存する。選ばなかったら null */
export async function pickIconImage(): Promise<string | null> {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 1,
  });
  if (result.canceled || !result.assets[0]) return null;
  const asset = result.assets[0];
  // 正方形でないとき（Android で切り取りを使わなかったときなど）は、真ん中を切り取る
  const side = Math.min(asset.width, asset.height);
  const context = ImageManipulator.manipulate(asset.uri);
  if (asset.width !== asset.height) {
    context.crop({ originX: (asset.width - side) / 2, originY: (asset.height - side) / 2, width: side, height: side });
  }
  const image = await context.resize({ width: SIZE, height: SIZE }).renderAsync();
  const saved = await image.saveAsync({ format: SaveFormat.JPEG, compress: 0.85 });

  const dir = iconsDirectory();
  if (!dir.exists) dir.create({ intermediates: true });
  const name = `${newId()}.jpg`;
  new File(saved.uri).copy(new File(dir, name));
  return imageIcon(name);
}

/** どの習慣にも使われていない画像を消す（アイコンを変えたとき、習慣を消したとき、作るのをやめたとき） */
export function cleanupIconImages(): void {
  try {
    const dir = iconsDirectory();
    if (!dir.exists) return;
    const used = new Set(
      listAllHabits()
        .map((h) => parseIcon(h.icon))
        .flatMap((v) => (v.type === 'image' ? [v.file] : [])),
    );
    for (const item of dir.list()) {
      if (item instanceof File && !used.has(item.name)) item.delete();
    }
  } catch (e) {
    console.warn('[icons] cleanup failed', e);
  }
}

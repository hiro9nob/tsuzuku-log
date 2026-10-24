import { drizzle } from 'drizzle-orm/expo-sqlite';
import Constants from 'expo-constants';
import { Paths } from 'expo-file-system';
import { openDatabaseSync } from 'expo-sqlite';
import { Platform } from 'react-native';

import * as schema from './schema';

export const DATABASE_NAME = 'ongo.db';

/**
 * DB の置き場所。iOS はウィジェットからも読み書きできるよう、最初から App Group の共有の場所に置く。
 * 共有の場所が使えないとき（Expo Go など）は、既定の場所にする
 */
function databaseDirectory(): string | undefined {
  if (Platform.OS !== 'ios') return undefined;
  const group: unknown = Constants.expoConfig?.extra?.appGroup;
  if (typeof group !== 'string') return undefined;
  try {
    return Paths.appleSharedContainers[group]?.uri;
  } catch (e) {
    console.warn('[db] app group container unavailable', e);
    return undefined;
  }
}

export const sqlite = openDatabaseSync(DATABASE_NAME, undefined, databaseDirectory());
sqlite.execSync('PRAGMA foreign_keys = ON;');

export const db = drizzle(sqlite, { schema });

export type Db = typeof db;

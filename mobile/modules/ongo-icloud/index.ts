// iCloud Drive（アプリの iCloud コンテナの Documents/Backups）にバックアップを置く。iOS だけ
import { requireOptionalNativeModule } from 'expo';

export type ICloudFile = { name: string; modifiedAt: number; size: number; downloaded: boolean };

type NativeModule = {
  isAvailable(): Promise<boolean>;
  write(name: string, contents: string): Promise<void>;
  list(): Promise<ICloudFile[]>;
  read(name: string): Promise<string>;
  remove(name: string): Promise<void>;
};

export const OngoICloud = requireOptionalNativeModule<NativeModule>('OngoICloud');

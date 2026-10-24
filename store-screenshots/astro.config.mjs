// @ts-check
import { defineConfig } from 'astro/config';

// ストアのスクリーンショットを HTML で組み、scripts/export.mjs で PNG に書き出す
export default defineConfig({
  trailingSlash: 'always',
  devToolbar: { enabled: false },
});

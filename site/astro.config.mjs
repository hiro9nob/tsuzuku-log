// @ts-check
import { defineConfig } from 'astro/config';

import sitemap from '@astrojs/sitemap';

// docs/site.md：静的なサイトを Cloudflare Workers の静的アセットで配信する（アダプターは使わない）
export default defineConfig({
  site: 'https://ongo.no9.app',
  trailingSlash: 'always',

  i18n: {
    locales: ['en', 'ja'],
    defaultLocale: 'en',
    routing: { prefixDefaultLocale: false },
  },

  // Google に見つけてもらうためのサイトマップ。言語違いのページは hreflang でつなぐ。404 は入れない
  integrations: [
    sitemap({
      i18n: { defaultLocale: 'en', locales: { en: 'en', ja: 'ja' } },
      filter: (page) => !page.includes('/404'),
    }),
  ],
});
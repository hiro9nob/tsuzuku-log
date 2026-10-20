export const LANGS = ['en', 'ja'] as const;
export type Lang = (typeof LANGS)[number];

// アプリの文（mobile/src/lib/i18n/locales/*.json）と食い違わないようにする。Pro の内容と価格は mobile/scripts/store/config.mjs
export const ui = {
  en: {
    langName: 'English',
    appName: 'Ongo',
    siteDescription:
      'Ongo is a habit tracker where rest days don’t break your streak. Unlimited habits, free logging forever, no ads and no sign-up. Your records stay on your phone.',
    nav: { support: 'Support', terms: 'Terms of Use', privacy: 'Privacy Policy' },
    pageDescriptions: {
      support: 'Answers to common questions about Ongo: rest days, where records are stored, moving to a new phone, Pro, subscriptions and refunds.',
      terms: 'The terms of use for the Ongo app and Ongo Pro.',
      privacy: 'How Ongo handles your data. Records stay on your device; purchases are processed by the app store and RevenueCat.',
    },
    ogAlt: 'Ongo: rest days don’t break your streak.',
    hero: {
      tagline: 'Rest days don’t break your streak.',
      title: 'Rest days don’t break your streak.',
      body: 'You were sick on Tuesday. You traveled over the weekend. Most habit apps reset you to zero. Ongo lets you mark a rest day, keeps the streak going, and counts "3 times a week" as a streak too.',
      comingSoon: 'Coming soon to iPhone',
      appStore: 'Download on the App Store',
    },
    dots: {
      intro: 'One week, the Ongo way',
      days: ['M', 'T', 'W', 'T', 'F', 'S', 'S'],
      // 'done' は塗りつぶし、'rest' は中空の丸（アプリと同じ）
      marks: ['done', 'done', 'rest', 'done', 'done', 'rest', 'done'],
      caption: 'Hollow circles are rest days. The streak keeps going.',
    },
    steps: [
      { title: 'One tap to log', body: 'Tap the big circle. Tapped by mistake? Undo right there. Counts like 2 L of water or "no more than 3 drinks a week" work too.', shot: 'today', alt: 'The Today screen with habits logged by tapping' },
      { title: 'Rest without guilt', body: 'Feeling unwell or away from home? Mark the day as rest. It shows as a hollow circle and your streak stays.', shot: 'rest', alt: 'Choosing a rest day for a habit' },
      { title: 'See it add up', body: 'Current streak, longest streak and every day in one grid — done days and rest days alike.', shot: 'detail', alt: 'A habit’s streaks and history grid' },
      { title: 'Find your pace', body: 'Weekly and monthly rates for every habit. Not every day? "3 times a week" is a perfectly good goal.', shot: 'review', alt: 'Weekly and monthly completion rates' },
    ],
    facts: {
      title: 'Before you download',
      items: [
        { label: 'Unlimited, free logging', body: 'No limit on the number of habits. Logging, undo, fixing past days and rest days are free forever. No ads.' },
        { label: 'Your records stay on your phone', body: 'No account and no tracking. Back up to iCloud Drive or export a file whenever you like.' },
        { label: 'Late nights are fine', body: 'Choose when your day starts (midnight, 2, 4 or 6 AM) so after-midnight logs count for the same day.' },
        { label: '11 languages', body: 'English, Japanese, Chinese, Korean, Spanish, French, German, Portuguese, Thai and Indonesian.' },
      ],
    },
    plus: {
      title: 'Free, with an optional Pro',
      body: 'Everything you need to build habits is free. Ongo Pro — $1.49 a month, $9.99 a year, or $24.99 once — adds color themes, habit colors and custom icons, custom repeats, multiple reminders, detailed stats, note search and more share card designs.',
    },
    more: 'Questions? See Support',
    support: {
      title: 'Support',
      lead: 'Answers to common questions. If you need more help, feel free to contact us.',
      faq: [
        { q: 'What is a rest day?', a: 'A day you choose not to count, for example when you are sick or traveling. Open the "…" menu on a habit in Today and choose rest. Rest days appear as hollow circles and don’t break your streak.' },
        { q: 'Where are my records stored?', a: 'On your device. They are not sent to us or to any server of ours. If you turn on iCloud backup, a copy is saved in the "Ongo" folder of your own iCloud Drive. If you delete the app without a backup or an export, your records are deleted too.' },
        { q: 'How do I move to a new phone?', a: 'With iCloud backup on, sign in to the same iCloud on your new iPhone and use "Restore from iCloud" in Settings. Or, on your old phone, open Settings → Export (JSON) and save the file, then on your new phone open Settings → Import and choose that file. To use Pro on the new phone, tap "Restore purchases".' },
        { q: 'My day doesn’t end at midnight.', a: 'In Settings → Day starts at, choose 2, 4 or 6 AM. Logs before that time count for the previous day.' },
        { q: 'I reinstalled the app and Pro is gone.', a: 'Open the Pro screen (Me → Your plan) and tap "Restore purchases", signed in with the same Apple Account you used to buy it.' },
        { q: 'How do I cancel my subscription?', a: 'On iPhone: Settings → your name → Subscriptions. Deleting the app does not cancel the subscription.' },
        { q: 'How do I get a refund?', a: 'Refunds are handled by Apple under its policies. Please request one at reportaproblem.apple.com.' },
      ],
      contactTitle: 'Contact',
      contactBody: 'Email us at the address below. Please include:',
      contactItems: ['The app name or the website URL', 'A short summary of your inquiry', 'The details of your inquiry', 'A screenshot of the relevant part'],
      contactNote: 'Telling us your device, OS version and app version (Settings → About) also helps us answer faster.',
    },
    legal: {
      draft: 'This is a draft and is not yet in effect.',
      effective: 'Effective date:',
    },
    notFound: { title: 'Page not found', back: 'Back to home' },
    footer: { language: 'Language' },
  },
  ja: {
    langName: '日本語',
    appName: 'つづくログ',
    siteDescription:
      'つづくログは、休んでも連続記録が途切れない習慣トラッカー。習慣はいくつでも、記録はずっと無料。広告もログインもなく、記録は端末の中に残ります。',
    nav: { support: 'サポート', terms: '利用規約', privacy: 'プライバシーポリシー' },
    pageDescriptions: {
      support: 'つづくログのよくある質問。お休み、記録の保存場所、機種変更、Pro、サブスクリプションの解約、返金について。',
      terms: 'つづくログと Ongo Pro の利用規約。',
      privacy: 'つづくログのデータの扱い。記録は端末の中に保存し、購入はストアと RevenueCat が処理します。',
    },
    ogAlt: 'つづくログ：休んでも、途切れない。',
    hero: {
      tagline: '休んでも、途切れない習慣トラッカー。',
      title: '休んでも、途切れない。',
      body: '火曜日は熱が出た。週末は旅行だった。多くの習慣アプリでは、そこで連続記録がゼロに戻ります。つづくログなら、その日を「お休み」にして、連続はそのまま。「週に3回」の習慣も、連続として数えます。',
      comingSoon: 'iPhone で、まもなく公開',
      appStore: 'App Store からダウンロード',
    },
    dots: {
      intro: 'つづくログの1週間',
      days: ['月', '火', '水', '木', '金', '土', '日'],
      marks: ['done', 'done', 'rest', 'done', 'done', 'rest', 'done'],
      caption: '中空の丸がお休みの日。連続は途切れません。',
    },
    steps: [
      { title: '記録は1タップ', body: '大きな丸を押すだけ。押しまちがえたら、その場で取り消せます。「水を2L」のような数の記録や、「お酒は週3杯まで」のような上限も。', shot: 'today', alt: 'タップで記録する「きょう」の画面' },
      { title: '休むことに、罪悪感なく', body: '体調が悪い日や旅行の日は「お休み」に。中空の丸で残り、連続記録はそのままです。', shot: 'rest', alt: '習慣をお休みにする画面' },
      { title: '積み重ねが見える', body: 'いまの連続、最長の連続、これまでの毎日をマス目で。できた日もお休みの日も残ります。', shot: 'detail', alt: '習慣の連続日数と記録のマス目' },
      { title: '自分のペースを見つける', body: '週と月の達成率を、習慣ごとに。毎日でなくても、「週に3回」で十分な目標です。', shot: 'review', alt: '週と月の達成率' },
    ],
    facts: {
      title: 'ダウンロードの前に',
      items: [
        { label: '習慣は無制限、記録はずっと無料', body: '習慣の数に上限はありません。記録、取り消し、過去の日の修正、お休みは、ずっと無料。広告も出しません。' },
        { label: '記録は端末の中に', body: 'アカウント登録もトラッキングもありません。iCloud Drive へのバックアップや、ファイルへの書き出しができます。' },
        { label: '夜ふかしでも大丈夫', body: '1日の区切りを0時・2時・4時・6時から選べます。夜中の記録も、その日の分になります。' },
        { label: '11言語に対応', body: '日本語、英語、中国語、韓国語、スペイン語、フランス語、ドイツ語、ポルトガル語、タイ語、インドネシア語。' },
      ],
    },
    plus: {
      title: '無料で使えて、Pro は選べます',
      body: '習慣を続けるための機能は無料です。Ongo Pro（月額 ¥250／年額 ¥1,500／買い切り ¥3,600）にすると、カラーテーマ、習慣の色とカスタムアイコン、細かい繰り返し、複数の通知、詳しい統計、メモの検索、シェアカードのデザインが使えます。',
    },
    more: 'よくある質問はサポートへ',
    support: {
      title: 'サポート',
      lead: 'よくある質問をまとめました。解決しないときは、お気軽にお問い合わせください。',
      faq: [
        { q: '「お休み」とは？', a: '体調不良や旅行などで、その日は数えないことにする記録です。「きょう」の画面で習慣の「…」からお休みにできます。お休みの日は中空の丸で表示され、連続記録は途切れません。' },
        { q: '記録はどこに保存されますか？', a: 'あなたの端末の中です。私たちのサーバーに送られることはありません。iCloud バックアップをオンにすると、あなた自身の iCloud Drive の「Ongo」フォルダにも保存されます。バックアップも書き出しもせずにアプリを削除すると、記録も消えます。' },
        { q: '機種変更のときは？', a: 'iCloud バックアップをオンにしていれば、新しい iPhone で同じ iCloud にサインインし、設定の「iCloud から戻す」を使います。または、古い端末で「設定 → 書き出す（JSON）」でファイルを保存し、新しい端末で「設定 → 取り込む」からそのファイルを選んでください。Pro は、新しい端末で「購入を復元」を押すと使えます。' },
        { q: '0時で1日が終わらない生活です', a: '「設定 → 1日の区切り」で、2時・4時・6時を選べます。その時刻より前の記録は、前の日の分になります。' },
        { q: 'アプリを入れ直したら Pro が使えなくなりました', a: '購入したときと同じ Apple アカウントで、Pro の画面（マイページ →「いまのプラン」）の「購入を復元」を押してください。' },
        { q: 'サブスクリプションを解約するには？', a: 'iPhone の「設定」→ 自分の名前 →「サブスクリプション」から解約します。アプリを削除しても解約にはなりません。' },
        { q: '返金してほしい', a: '返金は Apple が規定に沿って対応します。reportaproblem.apple.com からお申し込みください。' },
      ],
      contactTitle: 'お問い合わせ',
      contactBody: '下のアドレスにメールをお送りください。お問い合わせの際は、次の内容を添えてください。',
      contactItems: ['アプリ名またはサイトの URL', 'お問い合わせの概要', 'お問い合わせの詳細', '該当箇所のスクリーンショット'],
      contactNote: 'あわせて端末の機種、OS のバージョン、アプリのバージョン（設定 →「このアプリについて」）を書いていただけると、早くお答えできます。',
    },
    legal: {
      draft: 'これは下書きで、まだ効力はありません。',
      effective: '施行日：',
    },
    notFound: { title: 'ページが見つかりません', back: 'トップへ戻る' },
    footer: { language: '言語' },
  },
} as const;

/** 言語ごとの URL。英語は接頭辞なし、日本語は /ja/ */
export function localePath(lang: Lang, path = '') {
  const clean = path.replace(/^\/+|\/+$/g, '');
  const base = lang === 'en' ? '/' : `/${lang}/`;
  return clean ? `${base}${clean}/` : base;
}

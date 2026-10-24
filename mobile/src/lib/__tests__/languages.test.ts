import { resolveLanguage } from '../i18n/languages';

describe('resolveLanguage', () => {
  it('中国語を簡体字と繁体字に振り分ける', () => {
    expect(resolveLanguage(['zh-Hans-CN'])).toBe('zh-CN');
    expect(resolveLanguage(['zh-Hant-TW'])).toBe('zh-TW');
    expect(resolveLanguage(['zh-HK'])).toBe('zh-TW');
    expect(resolveLanguage(['zh-Hans-HK'])).toBe('zh-CN');
    expect(resolveLanguage(['zh'])).toBe('zh-CN');
  });
  it('地域付きのタグも基本の言語に振り分ける', () => {
    expect(resolveLanguage(['pt-BR'])).toBe('pt');
    expect(resolveLanguage(['en_GB'])).toBe('en');
    expect(resolveLanguage(['in-ID'])).toBe('id');
  });
  it('優先順に見て、最初に対応している言語を使う', () => {
    expect(resolveLanguage(['vi-VN', 'ko-KR', 'en-US'])).toBe('ko');
  });
  it('対応外なら英語', () => {
    expect(resolveLanguage(['vi-VN'])).toBe('en');
    expect(resolveLanguage([])).toBe('en');
  });
});

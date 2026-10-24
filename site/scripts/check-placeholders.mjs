// 公開する前に、【】の仮置き（運営者名、連絡先など）が残っていないかを確かめる（docs/site.md）
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const found = [];
function walk(dir) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walk(path);
    else if (/\.(html|xml|txt)$/.test(name)) {
      const matches = readFileSync(path, 'utf8').match(/【[^】]*】/g);
      if (matches) found.push(`${path}: ${[...new Set(matches)].join(' ')}`);
    }
  }
}
walk('dist');
if (found.length > 0) {
  console.error('仮置きが残っています。src/config.ts と src/content/ を直してください：\n' + found.join('\n'));
  process.exit(1);
}
console.log('仮置きは残っていません');

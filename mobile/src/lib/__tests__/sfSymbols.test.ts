import { FREE_ICONS, PRO_ICONS } from '../icons';
import { hasSfSymbol } from '../sfSymbols';

it('every selectable icon has an SF Symbol for widgets', () => {
  expect([...FREE_ICONS, ...PRO_ICONS].filter((i) => !hasSfSymbol(i))).toEqual([]);
});

describe('icons', () => {
  const { effectiveIcon, imageIcon, parseIcon } = jest.requireActual('../icons') as typeof import('../icons');

  it('parses image icons and keeps only the file name', () => {
    expect(parseIcon(imageIcon('a.jpg'))).toEqual({ type: 'image', file: 'a.jpg' });
    expect(parseIcon('image:../../x.jpg')).toEqual({ type: 'image', file: '....x.jpg' });
  });

  it('falls back to a basic icon without Pro', () => {
    expect(effectiveIcon(imageIcon('a.jpg'), false)).toBe('checkmark-circle');
    expect(effectiveIcon(imageIcon('a.jpg'), true)).toBe('image:a.jpg');
    expect(effectiveIcon('water', false)).toBe('water');
  });
});

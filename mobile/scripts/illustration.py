# ChatGPT で作ったイラストを整える：まわりのぼかしを消し、緑と白の2色にそろえ、ライト用とダーク用を作る
# 使い方（mobile/ で）: python3 scripts/illustration.py ../docs/illustrations/<名前>.png assets/illustrations <名前> [幅px]
# ChatGPT の絵は、まわりにほとんど透明なぼかしが付くことがあり、ダークモードでもやに見えるので消す
import sys
from PIL import Image

src, out, name = sys.argv[1], sys.argv[2], sys.argv[3]
width = int(sys.argv[4]) if len(sys.argv) > 4 else 900

GREEN = (0x4A, 0x7C, 0x59)
WHITE = (0xFF, 0xFF, 0xFF)
VARIANTS = {
    '': {'green': GREEN, 'white': WHITE},
    # ダーク：線と塗りは明るい緑、白だった部分はダークのカードの色
    '-dark': {'green': (0x8D, 0xBF, 0x9C), 'white': (0x1F, 0x1F, 0x21)},
}

im = Image.open(src).convert('RGBA')
w, h = im.size
px = im.load()

# 1. 形を決める：ほとんど不透明なところだけを残す（ぼかしを消す）。色は緑か白の近いほう
mask = []
for y in range(h):
    row = []
    for x in range(w):
        r, g, b, a = px[x, y]
        if a < 160:
            row.append(None)
        else:
            dg = (r - GREEN[0]) ** 2 + (g - GREEN[1]) ** 2 + (b - GREEN[2]) ** 2
            dw = (r - 255) ** 2 + (g - 255) ** 2 + (b - 255) ** 2
            row.append('green' if dg <= dw else 'white')
    mask.append(row)

# 2. 余白を切り詰める（上下左右に 4% の余白を残す）
xs = [x for y in range(h) for x in range(w) if mask[y][x]]
ys = [y for y in range(h) if any(mask[y])]
left, right, top, bottom = min(xs), max(xs), min(ys), max(ys)
pad = int(max(right - left, bottom - top) * 0.04)
box = (max(0, left - pad), max(0, top - pad), min(w, right + pad + 1), min(h, bottom + pad + 1))

for suffix, colors in VARIANTS.items():
    canvas = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    cp = canvas.load()
    for y in range(h):
        for x in range(w):
            k = mask[y][x]
            if k:
                cp[x, y] = (*colors[k], 255)
    cropped = canvas.crop(box)
    # 3. 縮めて、ふちをなめらかにする
    ratio = width / cropped.width
    result = cropped.resize((width, round(cropped.height * ratio)), Image.LANCZOS)
    path = f'{out}/{name}{suffix}.png'
    result.save(path, optimize=True)
    print(path, result.size)

"""Draws the favicon set: the cube seen corner-on, as 16×16 pixel art.

python3 tools/favicon.py  →  public/favicon.svg, favicon.ico (16+32), apple-touch-icon.png (180)
Colours are the game's: --bg and FACE_COLORS (index.html). Needs Pillow.
"""
from pathlib import Path
from PIL import Image

BG = '#07080d'
TOP, LEFT, RIGHT = '#f9c74f', '#4cc9f0', '#f72585'   # FACE_COLORS[3], [0], [1]
LIT = '#ffffff'                                       # the shared corner, lit

# Isometric at 2:1 on rows 1-15, cols 1-14. Per row: the outline's half-width, and the top face's.
# The top diamond is 7 rows (2,6,10,14,10,6,2 wide); the side faces drop 8 rows down the outer
# edges and meet in a point.
OUTLINE = [1, 3, 5, 7, 7, 7, 7, 7, 7, 7, 7, 7, 5, 3, 1]
TOPFACE = [1, 3, 5, 7, 5, 3, 1]
G = [[None] * 16 for _ in range(16)]
for r, out in enumerate(OUTLINE):
    top = TOPFACE[r] if r < len(TOPFACE) else 0
    for x in range(8 - out, 8 + out):
        d = x - 7 if x < 8 else x - 8                 # columns from the centre seam: 0 is the seam itself
        G[r + 1][x] = TOP if abs(d) < top else LEFT if x < 8 else RIGHT
for y, x in [(8, 7), (8, 8)]:                         # the shared corner, lit: one block on the seam
    G[y][x] = LIT

def image(scale, pad=0):
    n = 16 * scale + 2 * pad
    im = Image.new('RGB', (n, n), BG)
    for y in range(16):
        for x in range(16):
            if G[y][x]:
                im.paste(G[y][x], (pad + x * scale, pad + y * scale, pad + (x + 1) * scale, pad + (y + 1) * scale))
    return im

def svg():
    runs = []
    for y in range(16):
        x = 0
        while x < 16:
            c = G[y][x]; w = 1
            while x + w < 16 and G[y][x + w] == c: w += 1
            if c: runs.append(f'<rect x="{x}" y="{y}" width="{w}" height="1" fill="{c}"/>')
            x += w
    return ('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" shape-rendering="crispEdges">'
            f'<rect width="16" height="16" fill="{BG}"/>' + ''.join(runs) + '</svg>\n')

out = Path(__file__).resolve().parent.parent / 'public'
(out / 'favicon.svg').write_text(svg())
image(2).save(out / 'favicon.ico', sizes=[(16, 16), (32, 32)], append_images=[image(1)])
image(10, pad=10).save(out / 'apple-touch-icon.png', optimize=True)   # 160 + 2·10 = 180

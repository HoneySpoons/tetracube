"""Draws the 1200×630 share card: the favicon's cube scaled up, the title in the game's piece colours.

python3 tools/og.py  →  public/og.png
Needs Pillow. Press Start 2P (SIL OFL) is fetched once into tools/.cache/ and checked by hash.
"""
import hashlib
import urllib.request
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

from favicon import BG, G

FONT_URL = 'https://github.com/google/fonts/raw/main/ofl/pressstart2p/PressStart2P-Regular.ttf'
FONT_SHA256 = '034c77f1f05ec89421e4a63f0e3a4ca1ecf852cc6d2bf611f126f275728e017d'
PIECE_COLORS = ['#00d8ff', '#ffd60a', '#b15cff', '#38e07b', '#ff4d6d', '#3a86ff', '#ff9f1c']   # index.html, the title
INK, DIM, YELLOW = '#f4f4f4', '#8a8fa3', '#ffd60a'

here = Path(__file__).resolve().parent
font_path = here / '.cache' / 'PressStart2P-Regular.ttf'
if not font_path.exists():
    font_path.parent.mkdir(exist_ok=True)
    urllib.request.urlretrieve(FONT_URL, font_path)
if hashlib.sha256(font_path.read_bytes()).hexdigest() != FONT_SHA256:
    raise SystemExit(f'{font_path} does not match the pinned hash; delete it and check FONT_URL')
font = lambda px: ImageFont.truetype(str(font_path), px)   # multiples of 8 keep the glyphs on the pixel grid

W, H = 1200, 630
im = Image.new('RGB', (W, H), BG)
d = ImageDraw.Draw(im)
d.fontmode = '1'                                            # no antialiasing: hard pixels, like the game

# the cube, 16 px grid at 24× (384 px), left
S, x0, y0 = 24, 96, (H - 16 * 24) // 2
for y in range(16):
    for x in range(16):
        if G[y][x]:
            d.rectangle([x0 + x * S, y0 + y * S, x0 + (x + 1) * S - 1, y0 + (y + 1) * S - 1], fill=G[y][x])

# the words, right
tx = 560
for i, ch in enumerate('TETRACUBE'):                        # 64 px, the title's per-letter colours, with its hard shadow
    d.text((tx + i * 64 + 6, 150 + 6), ch, font=font(64), fill='#000000')
    d.text((tx + i * 64, 150), ch, font=font(64), fill=PIECE_COLORS[i % 7])
for j, line in enumerate(['A FALLING-BLOCK PUZZLE', 'ON FOUR FACES OF A CUBE.', 'THE CORNERS ARE SHARED.']):
    d.text((tx, 270 + j * 40), line, font=font(24), fill=INK)
d.text((tx, 430), 'FREE IN YOUR BROWSER', font=font(16), fill=DIM)
d.text((tx, 470), 'TETRACUBE.FUN', font=font(32), fill=YELLOW)

scan = Image.new('RGBA', (W, H), (0, 0, 0, 0))             # the page's CRT scanlines: 1 dark row in 3
sd = ImageDraw.Draw(scan)
for y in range(2, H, 3):
    sd.line([(0, y), (W, y)], fill=(0, 0, 0, 56))
im = Image.alpha_composite(im.convert('RGBA'), scan).convert('RGB')

im.save(here.parent / 'public' / 'og.png', optimize=True)

"""Genera el icono de la aplicación (PNG + ICO) sin dependencias externas.

Dibuja un cuadrado redondeado con degradado índigo→violeta y un prompt ">_"
en blanco, con antialiasing por supersampling. Escribe build/icon.png y
build/icon.ico (este último lo usa electron-builder para el instalador).
"""
import os
import struct
import zlib

OUT_DIR = "build"
SIZES = [16, 24, 32, 48, 64, 128, 256]

TOP = (99, 102, 241)     # #6366f1 índigo
BOTTOM = (139, 92, 246)  # #8b5cf6 violeta
WHITE = (255, 255, 255)


def lerp(a, b, t):
    return a + (b - a) * t


def seg_dist(px, py, ax, ay, bx, by):
    vx, vy = bx - ax, by - ay
    wx, wy = px - ax, py - ay
    l2 = vx * vx + vy * vy
    t = 0.0 if l2 == 0 else max(0.0, min(1.0, (wx * vx + wy * vy) / l2))
    dx, dy = px - (ax + t * vx), py - (ay + t * vy)
    return (dx * dx + dy * dy) ** 0.5


def render(size, ss=4):
    S = size * ss
    r = 0.22 * S

    def rounded(x, y):
        if x < r and y < r:
            return (x - r) ** 2 + (y - r) ** 2 <= r * r
        if x >= S - r and y < r:
            return (x - (S - r)) ** 2 + (y - r) ** 2 <= r * r
        if x < r and y >= S - r:
            return (x - r) ** 2 + (y - (S - r)) ** 2 <= r * r
        if x >= S - r and y >= S - r:
            return (x - (S - r)) ** 2 + (y - (S - r)) ** 2 <= r * r
        return True

    tip = (0.60 * S, 0.50 * S)
    tl = (0.30 * S, 0.30 * S)
    bl = (0.30 * S, 0.70 * S)
    hw = 0.045 * S          # mitad del grosor del trazo ">"
    us_x0, us_x1 = 0.70 * S, 0.86 * S
    us_y = 0.62 * S
    us_hw = 0.030 * S       # mitad del grosor del "_"

    def fg(x, y):
        d1 = seg_dist(x, y, tl[0], tl[1], tip[0], tip[1])
        d2 = seg_dist(x, y, bl[0], bl[1], tip[0], tip[1])
        if d1 <= hw or d2 <= hw:
            return True
        return seg_dist(x, y, us_x0, us_y, us_x1, us_y) <= us_hw

    rgba = []
    for y in range(size):
        for x in range(size):
            cbg = 0.0
            cfg = 0.0
            for sy in range(ss):
                for sx in range(ss):
                    px = x * ss + sx + 0.5
                    py = y * ss + sy + 0.5
                    if rounded(px, py):
                        cbg += 1.0
                        if fg(px, py):
                            cfg += 1.0
            n = ss * ss
            a = cbg / n
            if a == 0.0:
                rgba.append((0, 0, 0, 0))
                continue
            t = (x + y) / (2 * (size - 1))
            base = (
                int(lerp(TOP[0], BOTTOM[0], t)),
                int(lerp(TOP[1], BOTTOM[1], t)),
                int(lerp(TOP[2], BOTTOM[2], t)),
            )
            f = cfg / cbg
            rgb = (
                int(lerp(base[0], WHITE[0], f)),
                int(lerp(base[1], WHITE[1], f)),
                int(lerp(base[2], WHITE[2], f)),
            )
            rgba.append((rgb[0], rgb[1], rgb[2], int(a * 255)))
    return rgba


def png_chunk(tag, data):
    return (
        struct.pack(">I", len(data))
        + tag
        + data
        + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)
    )


def write_png(path, width, height, rgba):
    raw = bytearray()
    for y in range(height):
        raw.append(0)
        for x in range(width):
            raw += bytes(rgba[y * width + x])
    ihdr = struct.pack(">IIBBBBB", width, height, 8, 6, 0, 0, 0)
    png = b"\x89PNG\r\n\x1a\n"
    png += png_chunk(b"IHDR", ihdr)
    png += png_chunk(b"IDAT", zlib.compress(bytes(raw), 9))
    png += png_chunk(b"IEND", b"")
    with open(path, "wb") as f:
        f.write(png)


def write_ico(path, images):
    header = struct.pack("<HHH", 0, 1, len(images))
    entries = b""
    datas = b""
    offset = 6 + 16 * len(images)
    for size, png in images:
        b = 0 if size >= 256 else size
        entries += struct.pack("<BBBBHHII", b, b, 0, 0, 1, 32, len(png), offset)
        datas += png
        offset += len(png)
    with open(path, "wb") as f:
        f.write(header + entries + datas)


def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    images = []
    for size in SIZES:
        rgba = render(size, ss=4 if size >= 48 else 3)
        png_path = os.path.join(OUT_DIR, f"icon-{size}.png")
        write_png(png_path, size, size, rgba)
        with open(png_path, "rb") as f:
            images.append((size, f.read()))
    # PNG principal (256) para previsualización/README
    write_png(os.path.join(OUT_DIR, "icon.png"), 256, 256, render(256, ss=4))
    write_ico(os.path.join(OUT_DIR, "icon.ico"), images)
    print(f"Generados {len(SIZES)} tamaños + icon.ico en {OUT_DIR}/")


if __name__ == "__main__":
    main()

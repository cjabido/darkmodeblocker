import struct, zlib, os

def make_png(size, rgb):
    """Create a minimal valid PNG of solid color."""
    r, g, b = rgb

    def chunk(t, d):
        crc = zlib.crc32(t + d) & 0xffffffff
        return struct.pack('>I', len(d)) + t + d + struct.pack('>I', crc)

    rows = b''.join(b'\x00' + bytes([r, g, b] * size) for _ in range(size))
    return (
        b'\x89PNG\r\n\x1a\n' +
        chunk(b'IHDR', struct.pack('>IIBBBBB', size, size, 8, 2, 0, 0, 0)) +
        chunk(b'IDAT', zlib.compress(rows)) +
        chunk(b'IEND', b'')
    )

os.makedirs('extension/images', exist_ok=True)

# icon-off: gray (inactive state)
with open('extension/images/icon-off.png', 'wb') as f:
    f.write(make_png(48, (150, 150, 150)))

# icon-on: amber (active state)
with open('extension/images/icon-on.png', 'wb') as f:
    f.write(make_png(48, (255, 184, 0)))

print("Icons created: extension/images/icon-off.png, extension/images/icon-on.png")

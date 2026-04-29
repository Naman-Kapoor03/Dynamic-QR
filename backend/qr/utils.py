import string
import random
import qrcode
from io import BytesIO
import base64
from .models import QRCode

def generate_unique_code():
    while True:
        code =''.join(random.choices(string.ascii_uppercase + string.digits, k=6))
        if not QRCode.objects.filter(code=code).exists():
            return code


import qrcode
from PIL import Image, ImageDraw
from io import BytesIO
import base64


def generate_qr_image(data):
    qr = qrcode.QRCode(
        version=1,
        box_size=10,
        border=2,
    )
    qr.add_data(data)
    qr.make(fit=True)

    # base QR (black & white)
    img = qr.make_image(fill_color="black", back_color="white").convert("RGBA")

    width, height = img.size

    # 🎨 CREATE GREEN GRADIENT
    gradient = Image.new("RGBA", (width, height))
    draw = ImageDraw.Draw(gradient)

    for y in range(height):
        # gradient from light green → dark green
        r = 0
        g = int(150 + (105 * y / height))   # 150 → 255
        b = int(50 + (50 * y / height))     # 50 → 100
        draw.line([(0, y), (width, y)], fill=(r, g, b, 255))

    # 🎯 APPLY GRADIENT ON QR
    pixels = img.load()
    gradient_pixels = gradient.load()

    for x in range(width):
        for y in range(height):
            if pixels[x, y][0] < 50:  # black part
                pixels[x, y] = gradient_pixels[x, y]
            else:
                pixels[x, y] = (255, 255, 255, 0)

    # 💾 CONVERT TO BASE64
    buffer = BytesIO()
    img.save(buffer, format="PNG")
    return base64.b64encode(buffer.getvalue()).decode()

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
from PIL import Image
from io import BytesIO
import base64


def generate_qr_image(data):
    qr = qrcode.QRCode(
        version=None,
        box_size=10,
        border=2,
    )
    qr.add_data(data)
    qr.make(fit=True)

    # Create QR in black & white
    qr_img = qr.make_image(fill_color="black", back_color="white").convert("RGBA")

    width, height = qr_img.size

    # 🎨 Create gradient image
    gradient = Image.new("RGBA", (width, height))
    for y in range(height):
        for x in range(width):
            # green gradient (top → bottom)
            r = 0
            g = int(120 + (135 * y / height))  # 120 → 255
            b = int(50 + (80 * y / height))    # 50 → 130
            gradient.putpixel((x, y), (r, g, b, 255))

    # 🎯 Apply gradient only where QR is black
    qr_pixels = qr_img.load()
    gradient_pixels = gradient.load()

    for x in range(width):
        for y in range(height):
            if qr_pixels[x, y][0] < 100:  # detect black
                qr_pixels[x, y] = gradient_pixels[x, y]
            else:
                qr_pixels[x, y] = (255, 255, 255, 255)

    # Convert to base64
    buffer = BytesIO()
    qr_img.save(buffer, format="PNG")
    return base64.b64encode(buffer.getvalue()).decode()
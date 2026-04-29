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
import os


def generate_qr_with_logo(data):
    qr = qrcode.QRCode(
        version=None,
        box_size=10,
        border=2,
    )
    qr.add_data(data)
    qr.make(fit=True)

    # Create base QR
    qr_img = qr.make_image(fill_color="black", back_color="white").convert("RGBA")
    width, height = qr_img.size

    # 🎨 CREATE GREEN GRADIENT
    gradient = Image.new("RGBA", (width, height))
    for y in range(height):
        for x in range(width):
            r = 0
            g = int(120 + (135 * y / height))  # 120 → 255
            b = int(50 + (80 * y / height))    # 50 → 130
            gradient.putpixel((x, y), (r, g, b, 255))

    # 🎯 APPLY GRADIENT TO QR
    qr_pixels = qr_img.load()
    gradient_pixels = gradient.load()

    for x in range(width):
        for y in range(height):
            if qr_pixels[x, y][0] < 100:  # black part
                qr_pixels[x, y] = gradient_pixels[x, y]
            else:
                qr_pixels[x, y] = (255, 255, 255, 255)

    # 🟢 ADD LOGO IN CENTER
    try:
        logo_path = os.path.join("static", "qr_logo_aa.png")
        logo = Image.open(logo_path).convert("RGBA")

        # resize logo
        logo_size = width // 4
        logo = logo.resize((logo_size, logo_size))

        # position center
        pos = ((width - logo_size) // 2, (height - logo_size) // 2)

        qr_img.paste(logo, pos, mask=logo)

    except Exception as e:
        print("Logo load failed:", e)

    # 💾 convert to base64
    buffer = BytesIO()
    qr_img.save(buffer, format="PNG")
    return base64.b64encode(buffer.getvalue()).decode()
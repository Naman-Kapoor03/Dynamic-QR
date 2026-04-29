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


def generate_qr_image(data):
    qr = qrcode.make(data)
    buffer = BytesIO()
    qr.save(buffer, format='PNG')
    
    img_str = base64.b64encode(buffer.getvalue()).decode()
    return img_str

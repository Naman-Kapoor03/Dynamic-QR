import base64
from io import BytesIO
import qrcode
from dotenv import load_dotenv
import os

from rest_framework.response import Response
from django.http import HttpResponse, HttpResponsePermanentRedirect
from rest_framework.decorators import api_view
from django.shortcuts import redirect
from user_agents import parse


from .models import QRCode
from .utils import generate_unique_code, generate_qr_image
from analytics.models import QRScan
from PIL import Image

from PIL import Image, ImageDraw

load_dotenv()


def generate_qr_with_logo(url):
    import qrcode
    from PIL import Image
    import os
    from django.conf import settings

    qr = qrcode.QRCode(
        version=None,
        error_correction=qrcode.constants.ERROR_CORRECT_H,
        box_size=10,
        border=4,
    )

    qr.add_data(url)
    qr.make(fit=True)

    #  NORMAL QR (no dots)
    img = qr.make_image(fill_color="#2FD1A7", back_color="white").convert("RGB")

    #  ADD CENTER LOGO
    try:
        logo_path = os.path.join(settings.BASE_DIR, "static", "drydash.png")
        logo = Image.open(logo_path).convert("RGBA")

        img_w, img_h = img.size
        logo_size = img_w // 3   # slightly bigger for better look

        logo = logo.resize((logo_size, logo_size))

        pos = ((img_w - logo_size) // 2, (img_h - logo_size) // 2)

        img.paste(logo, pos, mask=logo)

    except Exception as e:
        print("Logo load failed:", e)

    return img

@api_view(['POST'])
def create_qr_code(request):
    data = request.data

    code = generate_unique_code()

    playstore = data.get('playstore_link')
    appstore = data.get('appstore_link')

    if not playstore and not appstore:
        return Response({"error": "At least one link required"}, status=400)

    qr = QRCode.objects.create(
        name=data.get('name'),
        code=code,
        playstore_link=playstore,
        appstore_link=appstore,
        campaign=data.get('campaign'),
    )
    qr_url = f"https://dry-dash-qr.onrender.com/api/qr/scan/{qr.code}/"
    img = generate_qr_with_logo(qr_url)

    buffer = BytesIO()
    img.save(buffer, format="PNG")

    qr_image = base64.b64encode(buffer.getvalue()).decode()

    return Response({
        "qr_url": qr_url,
        "qr_code": qr.code,
        "qr_image": qr_image
    })



def scan_qr(request, code):
    print("SCAN HIT:", code)

    try:
        qr = QRCode.objects.get(code=code)
        print("FOUND:", qr.code)
    except QRCode.DoesNotExist:
        print("QR NOT FOUND")
        return redirect("https://google.com")

    ua_string = request.META.get('HTTP_USER_AGENT', '')
    ua = parse(ua_string)

    print("OS:", ua.os.family)

    QRScan.objects.create(
        qr=qr,
        ip_address=request.META.get('REMOTE_ADDR'),
        user_agent=ua_string,
        device_type="Mobile" if ua.is_mobile else "Desktop",
        os=ua.os.family,
        browser=ua.browser.family
    )

    # redirect to tracking page instead of playstore/appstore
    return redirect(f"https://drydash-qr-system.netlify.app/#/track/{qr.code}/")
    
@api_view(['PUT'])
def update_qr(request, code):
    try:
        qr = QRCode.objects.get(code=code)
    except QRCode.DoesNotExist:
        return Response({"error": "QR not found"}, status=404)

    qr.playstore_link = request.data.get('playstore_link', qr.playstore_link)
    qr.appstore_link = request.data.get('appstore_link', qr.appstore_link)

    qr.save()

    return Response({
        "message": "QR updated successfully",
        "code": qr.code,
        "playstore_link": qr.playstore_link,
        "appstore_link": qr.appstore_link
    })


@api_view(['GET'])
def download_qr(request, code):
    try:
        qr = QRCode.objects.get(code=code)
    except QRCode.DoesNotExist:
        return Response({"error": "QR not found"}, status=404)

    qr_url = request.build_absolute_uri(f"/api/qr/scan/{qr.code}/")

    img = generate_qr_with_logo(qr_url)

    buffer = BytesIO()
    img.save(buffer, format="PNG")
    buffer.seek(0)

    return HttpResponse(
        buffer,
        content_type="image/png",
        headers={
            "Content-Disposition": f"attachment; filename={qr.code}.png"
        }
    )


@api_view(['DELETE'])
def delete_qr(request, code):
    try:
        qr = QRCode.objects.get(code=code)
        qr.delete()
        return Response({"message": "Deleted"})
    except QRCode.DoesNotExist:
        return Response({"error": "Not found"}, status=404)

import requests

def get_address_from_latlng(lat, lng):
    API_KEY = os.getenv("GOOGLE_MAPS_API_KEY")

    url = f"https://maps.googleapis.com/maps/api/geocode/json?latlng={lat},{lng}&key={API_KEY}"

    try:
        response = requests.get(url)
        data = response.json()

        if data["status"] == "OK":
            result = data["results"][0]
            return result.get("formatted_address")

    except Exception as e:
        print("Geocode error:", e)

    return None

@api_view(['POST'])
def save_location(request, code):
    try:
        qr = QRCode.objects.get(code=code)
    except QRCode.DoesNotExist:
        return Response({"error": "QR not found"}, status=404)

    latitude = request.data.get("latitude")
    longitude = request.data.get("longitude")

    scan = QRScan.objects.filter(qr=qr).order_by("-scanned_at").first()

    if scan:
        scan.latitude = latitude
        scan.longitude = longitude

        print("LAT:", latitude)
        print("LNG:", longitude)

        # 🔥 GET ADDRESS FROM GOOGLE
        address = get_address_from_latlng(latitude, longitude)

        print("ADDRESS:", address)

        # (for now just log it, we will store properly next step)
        scan.save()

    return Response({"message": "Location saved"})

def final_redirect(request, code):
    try:
        qr = QRCode.objects.get(code=code)
    except QRCode.DoesNotExist:
        return redirect("https://google.com")

    ua_string = request.META.get('HTTP_USER_AGENT', '')
    ua = parse(ua_string)

    # Android
    if "Android" in ua.os.family and qr.playstore_link:
        return redirect(qr.playstore_link)

    # iOS
    elif ("iOS" in ua.os.family or "iPhone" in ua.os.family) and qr.appstore_link:
        return redirect(qr.appstore_link)

    # fallback
    if qr.playstore_link:
        return redirect(qr.playstore_link)

    if qr.appstore_link:
        return redirect(qr.appstore_link)

    return redirect("https://google.com")
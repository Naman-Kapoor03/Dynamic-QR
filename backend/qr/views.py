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

    img = qr.make_image(fill_color="#2FD1A7", back_color="white").convert("RGB")

    try:
        logo_path = os.path.join(settings.BASE_DIR, "static", "drydash.png")
        logo = Image.open(logo_path).convert("RGBA")

        img_w, img_h = img.size
        logo_size = img_w // 3

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



from django.utils import timezone
from datetime import timedelta

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

    ip = request.META.get('REMOTE_ADDR')

    recent_scan = QRScan.objects.filter(
        qr=qr,
        ip_address=ip,
        scanned_at__gte=timezone.now() - timedelta(seconds=5)
    ).first()

    if recent_scan:
        print("DUPLICATE SCAN IGNORED")
    else:
        QRScan.objects.create(
            qr=qr,
            ip_address=ip,
            user_agent=ua_string,
            device_type="Mobile" if ua.is_mobile else "Desktop",
            os=ua.os.family,
            browser=ua.browser.family
        )

    return redirect(f"https://drydash-qr-system.netlify.app/#/track/{qr.code}")
    
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
        response = requests.get(url, timeout=5)
        data = response.json()

        if data["status"] == "OK":
            results = data["results"]

            # Always return full formatted_address from most specific result
            full_address = results[0].get("formatted_address")
            print("RESOLVED ADDRESS:", full_address)
            return full_address

    except Exception as e:
        print("Geocode error:", e)

    return None


def get_client_ip(request):
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        return x_forwarded_for.split(',')[0].strip()
    return request.META.get('REMOTE_ADDR')


@api_view(['POST'])
def save_location(request, code):
    try:
        qr = QRCode.objects.get(code=code)
    except QRCode.DoesNotExist:
        return Response({"error": "QR not found"}, status=404)

    latitude  = request.data.get("latitude")
    longitude = request.data.get("longitude")
    accuracy  = request.data.get("accuracy")

    # ── latest scan without address first
    scan = QRScan.objects.filter(
        qr=qr,
        address__isnull=True
    ).order_by("-scanned_at").first()

    if not scan:
        scan = QRScan.objects.filter(qr=qr).order_by("-scanned_at").first()

    if not scan:
        return Response({"message": "No scan found"})

    # ─────────────────────────────
    # CASE 1: GPS AVAILABLE
    # ─────────────────────────────
    if latitude and longitude:

        print(f"GPS USED lat={latitude} lng={longitude} accuracy={accuracy}m")

        address = get_address_from_latlng(latitude, longitude)

        print("ADDRESS:", address)

        scan.latitude = latitude
        scan.longitude = longitude
        scan.address = address

        if hasattr(scan, 'location_type'):
            scan.location_type = "GPS"

        if hasattr(scan, 'accuracy'):
            scan.accuracy = accuracy

    # ─────────────────────────────
    # CASE 2: IP FALLBACK
    # ─────────────────────────────
    else:
        print("IP FALLBACK USED")

        ip = get_client_ip(request)
        print("REAL IP:", ip)

        try:
            res = requests.get(
                f"https://ipinfo.io/{ip}/json",
                timeout=4
            )

            data = res.json()

            loc = data.get("loc")

            if loc:
                ip_lat, ip_lng = loc.split(",")

                print("IP LAT:", ip_lat)
                print("IP LNG:", ip_lng)

                # 🔥 use SAME lat/lng fields
                scan.latitude = ip_lat
                scan.longitude = ip_lng

                # 🔥 NOW use Google API from IP lat/lng
                address = get_address_from_latlng(ip_lat, ip_lng)

                print("IP BASED ADDRESS:", address)

                scan.address = address

            if hasattr(scan, 'location_type'):
                scan.location_type = "IP"

        except Exception as e:
            print("IP lookup failed:", e)

    scan.save()

    return Response({"message": "Location saved"})

def final_redirect(request, code):
    try:
        qr = QRCode.objects.get(code=code)
    except QRCode.DoesNotExist:
        return redirect("https://google.com")

    ua_string = request.META.get('HTTP_USER_AGENT', '')
    ua = parse(ua_string)

    if "Android" in ua.os.family and qr.playstore_link:
        return redirect(qr.playstore_link)

    elif ("iOS" in ua.os.family or "iPhone" in ua.os.family) and qr.appstore_link:
        return redirect(qr.appstore_link)

    if qr.playstore_link:
        return redirect(qr.playstore_link)

    if qr.appstore_link:
        return redirect(qr.appstore_link)

    return redirect("https://google.com")
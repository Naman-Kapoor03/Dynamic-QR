from rest_framework.decorators import api_view
from rest_framework.response import Response
from qr.models import QRCode
from .models import QRScan
from django.db.models import Count
from django.db.models.functions import TruncDate
from datetime import datetime, timedelta
from django.utils.timezone import now
from django.core.paginator import Paginator
from django.db.models import Count


@api_view(['GET'])
def qr_analytics(request, code):
    try:
        qr = QRCode.objects.get(code=code)
    except QRCode.DoesNotExist:
        return Response({"error": "QR not found"}, status=404)

    scans = QRScan.objects.filter(qr=qr)

    time_filter = request.GET.get("time")
    device_filter = request.GET.get("device")
    start = request.GET.get("start")
    end = request.GET.get("end")

    current_time = now()

    # 🔹 TIME FILTER
    if time_filter == "today":
        scans = scans.filter(scanned_at__date=current_time.date())
    elif time_filter == "weekly":
        scans = scans.filter(scanned_at__gte=current_time - timedelta(days=7))
    elif time_filter == "monthly":
        scans = scans.filter(scanned_at__gte=current_time - timedelta(days=30))
    elif time_filter == "custom" and start and end:
        try:
            start_date = datetime.strptime(start, "%Y-%m-%d")
            end_date = datetime.strptime(end, "%Y-%m-%d")
            scans = scans.filter(scanned_at__range=[start_date, end_date])
        except:
            pass

    # 🔹 DEVICE FILTER
    if device_filter == "android":
        scans = scans.filter(os__icontains="Android")
    elif device_filter == "ios":
        scans = scans.filter(os__icontains="iOS")

    # 🔹 COUNTS
    total_scans = scans.count()
    android = scans.filter(os__icontains="Android").count()
    ios = scans.filter(os__icontains="iOS").count()

    # 🔹 DAILY GRAPH DATA
    daily_data = (
        scans
        .annotate(date=TruncDate('scanned_at'))
        .values('date')
        .annotate(count=Count('id'))
        .order_by('date')
    )

    # ✅ RECENT 10 SCANS — always from full unfiltered set
    recent_raw = QRScan.objects.filter(qr=qr).order_by("-scanned_at")[:10]
    recent_scans = [
        {
            "device": scan.os,
            "address": scan.address,
            "timestamp": scan.scanned_at,
        }
        for scan in recent_raw
    ]

    # 🔥 SECTOR BREAKDOWN USING ADDRESS (Option 1)
    import re
    from collections import Counter

    all_addresses = QRScan.objects.filter(qr=qr).values_list("address", flat=True)

    sector_counts = Counter()

    for addr in all_addresses:
        if addr:
            match = re.search(r"Sector\s*\d+[A-Za-z\-]*", addr)
            if match:
                sector = match.group()
                sector_counts[sector] += 1

    sector_data = [
        {
            "sector": sector,
            "scans": count
        }
        for sector, count in sector_counts.items()
    ]

    return Response({
        "name": qr.name,
        "qr_code": qr.code,
        "total_scans": total_scans,
        "android": android,
        "ios": ios,
        "daily_scans": list(daily_data),
        "recent_scans": recent_scans,
        "sector_data": sector_data,   # ✅ fixed
    })

@api_view(['GET'])
def all_qr_codes(request):
    qrs = QRCode.objects.all().values(
        'code', 'name', 'campaign'
    )
    return Response(qrs)


@api_view(['GET'])
def qr_history(request):
    qrs = QRCode.objects.all().order_by('-created_at')

    page = request.GET.get('page', 1)
    paginator = Paginator(qrs, 10)  # 10 per page

    current_page = paginator.get_page(page)

    data = []
    for qr in current_page:
        data.append({
            "name": qr.name,
            "code": qr.code,
            "total_scans": QRScan.objects.filter(qr=qr).count()
        })

    return Response({
        "data": data,
        "total_pages": paginator.num_pages,
        "current_page": int(page)
    })

import csv
from django.http import HttpResponse


@api_view(['GET'])
def export_qr_scans(request, code):
    try:
        qr = QRCode.objects.get(code=code)
    except QRCode.DoesNotExist:
        return Response({"error": "QR not found"}, status=404)

    scans = QRScan.objects.filter(qr=qr).order_by("-scanned_at")

    response = HttpResponse(content_type='text/csv')
    response['Content-Disposition'] = f'attachment; filename="{code}_scans.csv"'

    writer = csv.writer(response)

    writer.writerow([
        "IP Address",
        "Device",
        "OS",
        "Browser",
        "Country",
        "Region",
        "City",
        "Scanned At"
    ])

    for scan in scans:
        # handle localhost case
        ip = get_client_ip(request)
        print("REAL IP:", ip)
        
        is_local = ip in ["127.0.0.1", "localhost"]

        writer.writerow([
            ip,
            scan.device_type,
            scan.os,
            scan.browser,
            scan.country if not is_local else "Localhost",
            getattr(scan, "region", "") if not is_local else "",
            scan.city if not is_local else "",
            scan.scanned_at.strftime("%Y-%m-%d %H:%M:%S")
        ])

    return response


def get_client_ip(request):
    headers = request.META

    # Cloudflare real IP
    ip = headers.get('HTTP_CF_CONNECTING_IP')

    if not ip:
        ip = headers.get('HTTP_X_FORWARDED_FOR')

    if ip:
        ip = ip.split(',')[0]
    else:
        ip = headers.get('REMOTE_ADDR')

    return ip
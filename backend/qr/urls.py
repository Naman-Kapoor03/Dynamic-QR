from django.urls import path
from .views import (
    create_qr_code,
    download_qr,
    scan_qr,
    update_qr,
    delete_qr,
    save_location,     # added
    final_redirect
    )

urlpatterns = [
    path('create/', create_qr_code, name='create_qr_code'),
    path('scan/<str:code>/', scan_qr, name='scan_qr'),
    path('update/<str:code>/', update_qr, name='update_qr'),
    path('download/<str:code>/', download_qr, name='download_qr'),
    path('delete/<str:code>/', delete_qr, name='delete_qr'),
    path('location/<str:code>/', save_location, name='save_location'),
    path('redirect/<str:code>/', final_redirect, name='final_redirect'),
]
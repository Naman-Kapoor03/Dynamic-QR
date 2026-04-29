from django.urls import path
from .views import export_qr_scans, qr_analytics, qr_history

urlpatterns = [
    path('history/', qr_history),
    path('<str:code>/', qr_analytics),
    path('export/<str:code>/', export_qr_scans),
]
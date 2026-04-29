from django.db import models
from qr.models import QRCode

class QRScan(models.Model):
    qr = models.ForeignKey(QRCode, on_delete=models.CASCADE, related_name='scans')
    
    ip_address = models.GenericIPAddressField()
    user_agent = models.TextField()
    
    device_type = models.CharField(max_length=50)
    os = models.CharField(max_length=50)
    browser = models.CharField(max_length=50)
    
    country = models.CharField(max_length=100, blank=True, null=True)
    city = models.CharField(max_length=100, blank=True, null=True)
    
    scanned_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"{self.qr.name} - {self.scanned_at}"
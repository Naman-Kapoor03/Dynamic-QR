from django.db import models
import uuid

class QRCode(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255)
    
    code = models.CharField(max_length=255, unique=True)
    
    playstore_link = models.URLField()
    appstore_link = models.URLField()
    
    deep_link = models.URLField(blank=True, null=True)
    
    is_active = models.CharField(max_length=255, blank=True, null=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    campaign = models.CharField(max_length=255, blank=True, null=True)
    latitude = models.FloatField(null=True, blank=True)
    longitude = models.FloatField(null=True, blank=True)
    
    def __str__(self):
        return self.name
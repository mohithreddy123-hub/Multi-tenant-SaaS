from django.urls import re_path
from . import consumers

websocket_urlpatterns = [
    # Real-time dashboard sync — one room per tenant
    re_path(r'ws/tenant/(?P<tenant_id>[^/]+)/$', consumers.DashboardConsumer.as_asgi()),
    # Collaborative editor — one room per document
    re_path(r'ws/editor/(?P<doc_id>\d+)/$', consumers.EditorConsumer.as_asgi()),
]

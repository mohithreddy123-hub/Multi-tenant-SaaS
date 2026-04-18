"""
views.py — Re-export hub.
All logic lives in domain-specific modules.
urls.py imports remain unchanged.
"""
from .views_auth import TenantRegisterView, LoginView, MeView          # noqa: F401
from .views_dashboard import DashboardView                              # noqa: F401
from .views_billing import BillingView, PayInvoiceView                  # noqa: F401
from .views_team import TeamView                                         # noqa: F401
from .views_settings import (                                           # noqa: F401
    UpdateProfileView,
    UpdatePasswordView,
    UpdateWorkspaceView,
)
from .views_documents import (                                          # noqa: F401
    DocumentListView,
    DocumentUploadView,
    DocumentDownloadView,
    DocumentPreviewView,
    DocumentVersionListView,
    DocumentRollbackView,
    DocumentAnalyticsView,
)

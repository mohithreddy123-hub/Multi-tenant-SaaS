from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView

from .views import (
    TenantRegisterView,
    LoginView,
    MeView,
    DashboardView,
    BillingView,
    PayInvoiceView,
    TeamView,
    DocumentListView,
    DocumentUploadView,
    DocumentDownloadView,
    DocumentPreviewView,
    DocumentVersionListView,
    DocumentRollbackView,
    DocumentAnalyticsView,
    DocumentDeleteView,
    UpdateProfileView,
    UpdatePasswordView,
    UpdateWorkspaceView,
)

urlpatterns = [
    # Auth Endpoints
    path('auth/register/', TenantRegisterView.as_view(), name='tenant-register'),
    path('auth/login/',    LoginView.as_view(),           name='login'),
    path('auth/refresh/',  TokenRefreshView.as_view(),    name='token-refresh'),
    path('auth/me/',       MeView.as_view(),              name='me'),

    # Dashboard & Billing
    path('dashboard/',     DashboardView.as_view(),       name='dashboard'),
    path('billing/',       BillingView.as_view(),         name='billing'),
    path('billing/pay/',   PayInvoiceView.as_view(),      name='pay-invoice'),

    # Settings API
    path('settings/profile/',   UpdateProfileView.as_view(),   name='settings-profile'),
    path('settings/password/',  UpdatePasswordView.as_view(),  name='settings-password'),
    path('settings/workspace/', UpdateWorkspaceView.as_view(), name='settings-workspace'),

    # Team Management
    path('team/',              TeamView.as_view(), name='team-list'),
    path('team/<int:user_id>/', TeamView.as_view(), name='team-delete'),

    # Documents — Core
    path('documents/',                           DocumentListView.as_view(),        name='document-list'),
    path('documents/upload/',                    DocumentUploadView.as_view(),      name='document-upload'),
    path('documents/<int:pk>/download/',         DocumentDownloadView.as_view(),    name='document-download'),
    path('documents/<int:pk>/preview/',          DocumentPreviewView.as_view(),     name='document-preview'),
    path('documents/<int:pk>/',                  DocumentDeleteView.as_view(),      name='document-delete'),

    # Documents — Versioning
    path('documents/<int:pk>/versions/',                         DocumentVersionListView.as_view(), name='document-versions'),
    path('documents/<int:pk>/rollback/<int:version_number>/',    DocumentRollbackView.as_view(),    name='document-rollback'),

    # Documents — Analytics
    path('documents/<int:pk>/analytics/', DocumentAnalyticsView.as_view(), name='document-analytics'),
]

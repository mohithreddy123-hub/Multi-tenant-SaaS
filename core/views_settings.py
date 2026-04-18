"""
Settings views: UpdateProfileView, UpdatePasswordView, UpdateWorkspaceView
"""
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from .models import User


class UpdateProfileView(APIView):
    """PATCH /api/settings/profile/ — update username & email"""
    permission_classes = [IsAuthenticated]

    def patch(self, request):
        user = request.user
        username = request.data.get('username', '').strip()
        email = request.data.get('email', '').strip()

        if username and username != user.username:
            if User.objects.filter(username__iexact=username).exclude(pk=user.pk).exists():
                return Response({'detail': 'Username already taken.'}, status=400)
            user.username = username

        if email and email != user.email:
            if User.objects.filter(email__iexact=email).exclude(pk=user.pk).exists():
                return Response({'detail': 'Email already in use by another account.'}, status=400)
            user.email = email

        user.save()
        return Response({'message': 'Profile updated successfully.', 'username': user.username, 'email': user.email})


class UpdatePasswordView(APIView):
    """PATCH /api/settings/password/ — change password"""
    permission_classes = [IsAuthenticated]

    def patch(self, request):
        user = request.user
        current = request.data.get('current_password', '')
        new_pass = request.data.get('new_password', '')

        if not user.check_password(current):
            return Response({'detail': 'Current password is incorrect.'}, status=400)
        if len(new_pass) < 8:
            return Response({'detail': 'New password must be at least 8 characters.'}, status=400)

        user.set_password(new_pass)
        user.save()
        return Response({'message': 'Password changed successfully. Please log in again.'})


class UpdateWorkspaceView(APIView):
    """PATCH /api/settings/workspace/ — update company name (admin only)"""
    permission_classes = [IsAuthenticated]

    def patch(self, request):
        user = request.user
        if user.role != 'admin':
            return Response({'detail': 'Only workspace admins can change workspace settings.'}, status=403)
        if not user.tenant:
            return Response({'detail': 'No workspace associated.'}, status=400)

        tenant = user.tenant
        name = request.data.get('name', '').strip()

        if name and name != tenant.name:
            from .models import Tenant
            if Tenant.objects.filter(name__iexact=name).exclude(pk=tenant.pk).exists():
                return Response({'detail': 'A workspace with this name already exists.'}, status=400)
            tenant.name = name
            tenant.domain = f"{name.lower().replace(' ', '')}.yourapp.com"
            tenant.save()

        return Response({
            'message': 'Workspace updated successfully.',
            'name': tenant.name,
            'domain': tenant.domain,
        })

"""
Auth views: TenantRegisterView, LoginView, MeView
"""
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated

from .serializers import TenantRegistrationSerializer, LoginSerializer, UserSerializer


class TenantRegisterView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = TenantRegistrationSerializer(data=request.data)
        if serializer.is_valid():
            tenant, user = serializer.save()
            return Response({
                'message': f'Welcome! {tenant.name} has been registered successfully.',
                'tenant': {
                    'id': str(tenant.id),
                    'name': tenant.name,
                    'domain': tenant.domain,
                    'plan': tenant.plan,
                    'storage_limit_gb': tenant.storage_limit_gb,
                    'user_limit': tenant.user_limit,
                },
                'admin_user': {
                    'id': user.id,
                    'username': user.username,
                    'email': user.email,
                    'role': user.role,
                },
            }, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class LoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        if serializer.is_valid():
            return Response(serializer.validated_data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_401_UNAUTHORIZED)


class MeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        serializer = UserSerializer(request.user)
        return Response(serializer.data, status=status.HTTP_200_OK)

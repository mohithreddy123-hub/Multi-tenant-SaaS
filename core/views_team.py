"""
Team management views: TeamView
"""
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from .models import User


class TeamView(APIView):
    """
    GET    /api/team/            — list all users in the tenant
    POST   /api/team/            — admin adds a new team member (enforces user_limit)
    DELETE /api/team/<user_id>/  — admin removes a member
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        tenant = request.user.tenant
        if not tenant:
            return Response({'detail': 'No tenant.'}, status=403)
        members = tenant.users.all().order_by('date_joined')
        return Response({
            'members': [
                {
                    'id': u.id,
                    'username': u.username,
                    'email': u.email,
                    'role': u.role,
                    'is_active': u.is_active,
                    'date_joined': u.date_joined.strftime('%b %d, %Y'),
                } for u in members
            ],
            'user_limit': tenant.user_limit,
            'current_count': members.count(),
            'slots_remaining': tenant.user_limit - members.count(),
        })

    def post(self, request):
        tenant = request.user.tenant
        if not tenant:
            return Response({'detail': 'No tenant.'}, status=403)
        if request.user.role != 'admin':
            return Response({'detail': 'Only admins can add team members.'}, status=403)

        current_count = tenant.users.count()
        if current_count >= tenant.user_limit:
            return Response({
                'detail': f'User limit reached ({tenant.user_limit}/{tenant.user_limit}). Upgrade your plan to add more members.'
            }, status=400)

        username = request.data.get('username', '').strip().lower()
        email    = request.data.get('email', '').strip()
        password = request.data.get('password', '').strip()
        role     = request.data.get('role', 'member')

        if not username or not email or not password:
            return Response({'detail': 'Username, email, and password are required.'}, status=400)
        if len(password) < 6:
            return Response({'detail': 'Password must be at least 6 characters.'}, status=400)
        if User.objects.filter(username__iexact=username).exists():
            return Response({'detail': f'Username "{username}" is already taken.'}, status=400)
        if User.objects.filter(email__iexact=email).exists():
            return Response({'detail': f'Email "{email}" is already registered.'}, status=400)

        new_user = User.objects.create_user(
            username=username,
            email=email,
            password=password,
            tenant=tenant,
            role=role if role in ['admin', 'member'] else 'member',
        )
        return Response({
            'message': f'✅ {username} has been added to {tenant.name}.',
            'member': {
                'id': new_user.id,
                'username': new_user.username,
                'email': new_user.email,
                'role': new_user.role,
            }
        }, status=201)

    def delete(self, request, user_id):
        tenant = request.user.tenant
        if request.user.role != 'admin':
            return Response({'detail': 'Only admins can remove members.'}, status=403)
        if request.user.id == user_id:
            return Response({'detail': 'You cannot remove yourself.'}, status=400)
        try:
            member = User.objects.get(id=user_id, tenant=tenant)
            member.delete()
            return Response({'message': f'{member.username} has been removed.'})
        except User.DoesNotExist:
            return Response({'detail': 'User not found.'}, status=404)

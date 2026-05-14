import json
from channels.generic.websocket import AsyncWebsocketConsumer


# ─────────────────────────────────────────────
# DashboardConsumer
# ─────────────────────────────────────────────
class DashboardConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.tenant_id = self.scope['url_route']['kwargs']['tenant_id']
        self.group_name = f"tenant_{self.tenant_id}"
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()
        await self.send(text_data=json.dumps({
            'type': 'connected',
            'message': f'Real-time sync active for tenant {self.tenant_id}'
        }))

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def receive(self, text_data):
        pass

    async def dashboard_update(self, event):
        await self.send(text_data=json.dumps(event))


# ─────────────────────────────────────────────
# EditorConsumer
# Handles collaborative editing for a single document.
# Group name: "editor_<doc_id>"
# Events: text_change, cursor_move, user_join, user_leave, chat_message
# ─────────────────────────────────────────────
class EditorConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.doc_id = self.scope['url_route']['kwargs']['doc_id']
        self.group_name = f"editor_{self.doc_id}"
        self.username = "Anonymous"

        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        # Notify ALL others this user left
        await self.channel_layer.group_send(
            self.group_name,
            {
                'type': 'editor_event',
                'event': 'user_leave',
                'username': self.username,
                'doc_id': self.doc_id,
            }
        )
        await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def receive(self, text_data):
        data = json.loads(text_data)
        event = data.get('event', 'text_change')

        # Track the username for this connection
        if 'username' in data:
            self.username = data['username']

        # Broadcast to ALL clients in this document's room (including sender)
        # The frontend uses username comparison to filter self-events where needed
        await self.channel_layer.group_send(
            self.group_name,
            {
                'type': 'editor_event',
                **data,
                'event': event,
            }
        )

    async def editor_event(self, event):
        # Remove the internal Django Channels 'type' key before sending to browser
        payload = {k: v for k, v in event.items() if k != 'type'}
        await self.send(text_data=json.dumps(payload))

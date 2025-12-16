# Realtime Module

WebSocket gateway for real-time event broadcasting.

## Quick Start

### Backend (Already Configured)

The RealtimeGateway is automatically initialized when the app starts. No additional configuration needed.

### Frontend Integration

```typescript
// lib/socket.ts
import { io } from 'socket.io-client';

export function getSocket(accessToken: string) {
  return io(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000', {
    auth: { token: accessToken }
  });
}
```

```typescript
// hooks/useAlerts.ts
import { useEffect } from 'react';
import { getSocket } from '@/lib/socket';

export function useRealtimeAlerts() {
  useEffect(() => {
    const socket = getSocket(accessToken);

    socket.on('alert:new', (alert) => {
      console.log('New alert:', alert);
      // Update your state/cache
    });

    return () => socket.disconnect();
  }, [accessToken]);
}
```

## Events

- `alert:new` - New alert created
- `geofence:event` - Geofence transition
- `device:status` - Device status changed
- `location:update` - Location updated

## Architecture

```
Alert Created
  ↓
AlertsService.createAlert()
  ↓
RealtimeGateway.emitNewAlert()
  ↓
Socket.IO broadcasts to all connected clients
  ↓
Frontend receives event
```

## Files

- `realtime.gateway.ts` - WebSocket gateway with JWT auth
- `realtime.module.ts` - Module configuration
- `index.ts` - Exports

## Authentication

Clients must provide a valid JWT token via:
- `auth.token` (recommended): `io(url, { auth: { token } })`
- `Authorization` header: `io(url, { extraHeaders: { Authorization: 'Bearer token' } })`

Invalid tokens result in immediate disconnection.

## Scaling

For multiple server instances, add Redis adapter:

```bash
npm install @socket.io/redis-adapter redis
```

```typescript
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';

// In gateway's afterInit()
const pubClient = createClient({ url: process.env.REDIS_URL });
const subClient = pubClient.duplicate();
await Promise.all([pubClient.connect(), subClient.connect()]);
server.adapter(createAdapter(pubClient, subClient));
```

## Monitoring

Check logs for connection events:
```
[RealtimeGateway] Client abc123 connected - User: clx1234567890
[RealtimeGateway] Emitting alert:new - Alert ID: clx5555555555
```

## See Also

- [Full Documentation](../../WEBSOCKET_GUIDE.md)
- [Project Summary](../../PROJECT_SUMMARY.md)

# API Usage Examples

This document provides practical examples of using the Smart Watch API.

## Table of Contents

- [Authentication Flow](#authentication-flow)
- [Device Registration](#device-registration)
- [Telemetry Submission](#telemetry-submission)
- [Geofencing Setup](#geofencing-setup)
- [Alert Handling](#alert-handling)
- [Notification Management](#notification-management)

## Authentication Flow

### 1. Parent Registration

```bash
POST /api/v1/auth/register
Content-Type: application/json

{
  "email": "john.doe@example.com",
  "password": "SecurePassword123!",
  "firstName": "John",
  "lastName": "Doe"
}
```

Response:
```json
{
  "user": {
    "id": "clx1234567890",
    "email": "john.doe@example.com",
    "role": "PARENT",
    "profile": {
      "id": "clx0987654321",
      "firstName": "John",
      "lastName": "Doe",
      "timezone": "UTC",
      "language": "en"
    }
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### 2. Parent Login

```bash
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "john.doe@example.com",
  "password": "SecurePassword123!"
}
```

### 3. Refresh Token

```bash
POST /api/v1/auth/refresh
Authorization: Bearer <refresh_token>
```

Response:
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

## Child Profile Management

### 1. Create Child Profile

```bash
POST /api/v1/children
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "firstName": "Emma",
  "lastName": "Doe",
  "dateOfBirth": "2015-05-15",
  "gender": "female",
  "homeLatitude": 40.7128,
  "homeLongitude": -74.0060,
  "schoolLatitude": 40.7589,
  "schoolLongitude": -73.9851,
  "schoolGeofenceRadius": 100
}
```

Response:
```json
{
  "id": "clx2222222222",
  "parentId": "clx0987654321",
  "firstName": "Emma",
  "lastName": "Doe",
  "dateOfBirth": "2015-05-15T00:00:00.000Z",
  "gender": "female",
  "homeLatitude": 40.7128,
  "homeLongitude": -74.0060,
  "schoolLatitude": 40.7589,
  "schoolLongitude": -73.9851,
  "schoolGeofenceRadius": 100,
  "isActive": true,
  "createdAt": "2025-12-06T10:00:00.000Z",
  "updatedAt": "2025-12-06T10:00:00.000Z"
}
```

### 2. Get All Children

```bash
GET /api/v1/children
Authorization: Bearer <access_token>
```

Response:
```json
[
  {
    "id": "clx2222222222",
    "firstName": "Emma",
    "lastName": "Doe",
    "devices": [
      {
        "id": "clx3333333333",
        "platform": "WEAR_OS",
        "model": "Samsung Galaxy Watch 5",
        "status": "ACTIVE",
        "lastSeenAt": "2025-12-06T10:30:00.000Z",
        "batteryLevel": 75
      }
    ]
  }
]
```

### 3. Update School Location

```bash
PATCH /api/v1/children/clx2222222222/school-location
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "latitude": 40.7589,
  "longitude": -73.9851,
  "radius": 150
}
```

## Device Registration

### 1. Register Device (Watch)

```bash
POST /api/v1/devices/register
Content-Type: application/json

{
  "hardwareId": "android-watch-abc123",
  "platform": "WEAR_OS",
  "model": "Samsung Galaxy Watch 5",
  "appVersion": "1.0.0",
  "osVersion": "Wear OS 4"
}
```

Response:
```json
{
  "deviceId": "clx3333333333",
  "deviceToken": "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6",
  "status": "ACTIVE"
}
```

**Important**: Save the `deviceToken` securely. It will be used for all subsequent API calls from the device.

### 2. Device Heartbeat

```bash
POST /api/v1/devices/heartbeat
X-Device-Token: a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6
Content-Type: application/json

{
  "batteryLevel": 75,
  "latitude": 40.7589,
  "longitude": -73.9851
}
```

Response:
```json
{
  "success": true,
  "timestamp": "2025-12-06T10:30:00.000Z"
}
```

## Telemetry Submission

### 1. Send Location Data

```bash
POST /api/v1/devices/telemetry
X-Device-Token: a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6
Content-Type: application/json

{
  "latitude": 40.7589,
  "longitude": -73.9851,
  "altitude": 10.5,
  "accuracy": 15.5,
  "speed": 1.5,
  "bearing": 180,
  "batteryLevel": 75,
  "heartRate": 80,
  "stepCount": 5000,
  "source": "GPS",
  "timestamp": "2025-12-06T10:30:00Z"
}
```

Response:
```json
{
  "success": true,
  "telemetryId": "clx4444444444"
}
```

### 2. Send SOS Alert

```bash
POST /api/v1/devices/sos
X-Device-Token: a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6
Content-Type: application/json

{
  "latitude": 40.7589,
  "longitude": -73.9851,
  "message": "Emergency help needed",
  "timestamp": "2025-12-06T10:35:00Z"
}
```

Response:
```json
{
  "success": true,
  "alertId": "clx5555555555",
  "message": "SOS alert created and sent to parent"
}
```

## Parent Monitoring

### 1. Get Child's Latest Location

```bash
GET /api/v1/children/clx2222222222/location/latest
Authorization: Bearer <access_token>
```

Response:
```json
{
  "id": "clx4444444444",
  "latitude": 40.7589,
  "longitude": -73.9851,
  "altitude": 10.5,
  "accuracy": 15.5,
  "speed": 1.5,
  "batteryLevel": 75,
  "heartRate": 80,
  "timestamp": "2025-12-06T10:30:00.000Z",
  "source": "GPS",
  "device": {
    "id": "clx3333333333",
    "model": "Samsung Galaxy Watch 5",
    "batteryLevel": 75
  }
}
```

### 2. Get Location History

```bash
GET /api/v1/children/clx2222222222/location/history?from=2025-12-06T00:00:00Z&to=2025-12-06T23:59:59Z&limit=100
Authorization: Bearer <access_token>
```

Response:
```json
[
  {
    "id": "clx4444444444",
    "latitude": 40.7589,
    "longitude": -73.9851,
    "accuracy": 15.5,
    "speed": 1.5,
    "batteryLevel": 75,
    "heartRate": 80,
    "timestamp": "2025-12-06T10:30:00.000Z",
    "source": "GPS"
  },
  {
    "id": "clx4444444443",
    "latitude": 40.7588,
    "longitude": -73.9850,
    "accuracy": 12.0,
    "speed": 2.0,
    "batteryLevel": 76,
    "heartRate": 85,
    "timestamp": "2025-12-06T10:29:30.000Z",
    "source": "GPS"
  }
]
```

### 3. Get Child Alerts

```bash
GET /api/v1/children/clx2222222222/alerts?status=NEW&limit=50
Authorization: Bearer <access_token>
```

Response:
```json
[
  {
    "id": "clx5555555555",
    "type": "SOS",
    "severity": "CRITICAL",
    "status": "NEW",
    "latitude": 40.7589,
    "longitude": -73.9851,
    "payload": {
      "message": "Emergency help needed",
      "triggeredAt": "2025-12-06T10:35:00.000Z"
    },
    "triggeredAt": "2025-12-06T10:35:00.000Z",
    "createdAt": "2025-12-06T10:35:00.000Z"
  },
  {
    "id": "clx5555555554",
    "type": "ENTERED_SCHOOL_ZONE",
    "severity": "LOW",
    "status": "SENT",
    "latitude": 40.7589,
    "longitude": -73.9851,
    "triggeredAt": "2025-12-06T08:30:00.000Z",
    "sentAt": "2025-12-06T08:30:01.000Z",
    "createdAt": "2025-12-06T08:30:00.000Z"
  }
]
```

## Notification Management

### 1. Update FCM Push Token

```bash
PATCH /api/v1/parent/push-token
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "token": "fcm-token-from-parent-app"
}
```

Response:
```json
{
  "id": "clx0987654321",
  "fcmToken": "fcm-token-from-parent-app",
  "enablePushNotifications": true
}
```

### 2. Get Notifications

```bash
GET /api/v1/notifications?limit=50
Authorization: Bearer <access_token>
```

Response:
```json
[
  {
    "id": "clx6666666666",
    "type": "ALERT",
    "channel": "PUSH",
    "status": "SENT",
    "title": "🆘 SOS Alert!",
    "body": "Emma has triggered an SOS alert!",
    "payload": {
      "alertId": "clx5555555555",
      "childId": "clx2222222222",
      "severity": "CRITICAL",
      "latitude": 40.7589,
      "longitude": -73.9851
    },
    "scheduledAt": "2025-12-06T10:35:00.000Z",
    "sentAt": "2025-12-06T10:35:01.000Z",
    "createdAt": "2025-12-06T10:35:00.000Z"
  }
]
```

### 3. Mark Notifications as Read

```bash
POST /api/v1/notifications/read
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "notificationIds": ["clx6666666666", "clx6666666665"]
}
```

Response:
```json
{
  "success": true,
  "count": 2
}
```

## Geofencing Events

The system automatically creates geofence events when a child enters or exits school/home zones. These events trigger alerts and notifications.

### Automatic Flow:

1. Device sends telemetry with location
2. System checks if location is within geofences
3. If state changed (entered/exited), creates `GeofenceEvent`
4. Creates corresponding `Alert` (LOW/MEDIUM severity)
5. Sends notification to parent

### Event Types:

- `ENTER_SCHOOL` - Child arrived at school
- `EXIT_SCHOOL` - Child left school
- `ENTER_HOME` - Child arrived home
- `EXIT_HOME` - Child left home

## Error Handling

### Common Error Responses

#### 401 Unauthorized
```json
{
  "statusCode": 401,
  "message": "Unauthorized"
}
```

#### 404 Not Found
```json
{
  "statusCode": 404,
  "message": "Child not found"
}
```

#### 400 Bad Request
```json
{
  "statusCode": 400,
  "message": [
    "latitude must be a number",
    "longitude must be a number"
  ],
  "error": "Bad Request"
}
```

#### 403 Forbidden
```json
{
  "statusCode": 403,
  "message": "You do not have access to this child"
}
```

## Rate Limiting

Currently, rate limiting is not implemented. For production, consider adding rate limiting middleware to prevent abuse.

Recommended limits:
- Auth endpoints: 5 requests/minute
- Telemetry endpoints: 60 requests/minute per device
- Other endpoints: 30 requests/minute per user

## Best Practices

### For Watch Applications:

1. **Telemetry Frequency**: Send location every 30-60 seconds during active use
2. **Batching**: Consider batching telemetry points when connectivity is poor
3. **Battery Optimization**: Reduce frequency when battery is low
4. **Heartbeat**: Send heartbeat every 5 minutes to keep connection alive
5. **Token Storage**: Store device token securely in encrypted storage
6. **Error Handling**: Implement retry logic with exponential backoff

### For Parent Applications:

1. **Token Management**: Refresh access token before expiration
2. **Real-time Updates**: Consider using polling or WebSocket for live updates
3. **Caching**: Cache child profiles and locations locally
4. **Push Notifications**: Handle FCM token updates and renewals
5. **Offline Support**: Queue actions when offline, sync when online

## Integration Examples

### React Native (Parent App)

```typescript
// API Client
import axios from 'axios';

const API_BASE_URL = 'http://localhost:3000/api/v1';

class SmartWatchAPI {
  private accessToken: string | null = null;

  async login(email: string, password: string) {
    const response = await axios.post(`${API_BASE_URL}/auth/login`, {
      email,
      password,
    });
    this.accessToken = response.data.accessToken;
    return response.data;
  }

  async getChildren() {
    const response = await axios.get(`${API_BASE_URL}/children`, {
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
      },
    });
    return response.data;
  }

  async getChildLocation(childId: string) {
    const response = await axios.get(
      `${API_BASE_URL}/children/${childId}/location/latest`,
      {
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
        },
      }
    );
    return response.data;
  }
}
```

### Wear OS (Kotlin)

```kotlin
// Device API Client
class DeviceAPIClient(private val deviceToken: String) {
    private val baseUrl = "http://api.example.com/api/v1"

    suspend fun sendTelemetry(
        latitude: Double,
        longitude: Double,
        batteryLevel: Int,
        heartRate: Int?
    ) {
        val client = OkHttpClient()
        val json = JSONObject().apply {
            put("latitude", latitude)
            put("longitude", longitude)
            put("batteryLevel", batteryLevel)
            if (heartRate != null) put("heartRate", heartRate)
            put("source", "GPS")
            put("timestamp", Instant.now().toString())
        }

        val request = Request.Builder()
            .url("$baseUrl/devices/telemetry")
            .addHeader("X-Device-Token", deviceToken)
            .post(json.toString().toRequestBody("application/json".toMediaType()))
            .build()

        client.newCall(request).execute()
    }

    suspend fun sendSOS(latitude: Double, longitude: Double) {
        // Similar implementation
    }
}
```

## Troubleshooting

### Device Token Issues

If device token is invalid:
1. Re-register the device
2. Check that token is correctly stored and sent
3. Verify device status in database

### Geofence Not Triggering

1. Check school/home location is set correctly
2. Verify geofence radius (default 100m)
3. Check telemetry accuracy - low accuracy may cause false triggers
4. Review geofence events in database

### Notifications Not Received

1. Verify FCM token is updated
2. Check Firebase credentials in .env
3. Verify parent has enabled push notifications
4. Check notification status in database

## WebSocket Support (Future)

For real-time location updates, consider implementing WebSocket:

```typescript
// Future WebSocket endpoint
const ws = new WebSocket('ws://localhost:3000/ws/children/:childId/location');

ws.onmessage = (event) => {
  const location = JSON.parse(event.data);
  console.log('New location:', location);
};
```

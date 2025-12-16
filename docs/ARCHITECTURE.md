# Architecture Documentation

## System Overview

The Smart Watch Backend is a production-ready microservice-oriented system designed to handle real-time telemetry data from children's smart watches and provide monitoring capabilities to parents.

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Client Layer                            │
├─────────────────────────┬───────────────────────────────────────┤
│   Wear OS Watches       │         Parent Apps                   │
│   (Device Token Auth)   │         (JWT Auth)                    │
└──────────┬──────────────┴──────────────┬────────────────────────┘
           │                             │
           ▼                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                      API Gateway Layer                          │
│                     NestJS Application                          │
│                     (Port 3000)                                 │
├─────────────────────────────────────────────────────────────────┤
│  Controllers:                                                   │
│  ├── Auth          ├── Devices       ├── Children              │
│  ├── Parent        ├── Telemetry     ├── Notifications         │
│  └── Bus (future)                                              │
└──────────┬──────────────────────────────────────┬──────────────┘
           │                                      │
           ▼                                      ▼
┌──────────────────────┐              ┌──────────────────────────┐
│   Service Layer      │              │   Background Workers     │
│                      │              │   (BullMQ Processors)    │
│  - Business Logic    │              │                          │
│  - Validation        │◄────────────►│  - Telemetry Processor   │
│  - Data Processing   │              │  - Alerts Processor      │
│                      │              │  - Notifications Proc.   │
└──────────┬───────────┘              └────────────┬─────────────┘
           │                                       │
           ▼                                       ▼
┌──────────────────────────────────────────────────────────────────┐
│                      Data Layer                                  │
├────────────────────────────┬─────────────────────────────────────┤
│     PostgreSQL             │          Redis                      │
│  - User data               │  - Job queues (BullMQ)              │
│  - Children profiles       │  - Session cache                    │
│  - Telemetry points        │  - Real-time data                   │
│  - Alerts & Events         │                                     │
└────────────────────────────┴─────────────────────────────────────┘
           │
           ▼
┌──────────────────────────────────────────────────────────────────┐
│                   External Services                              │
│  - Firebase Cloud Messaging (Push Notifications)                │
│  - Email Service (Future)                                       │
│  - SMS Gateway (Future)                                         │
└──────────────────────────────────────────────────────────────────┘
```

## Module Architecture

### Core Modules

#### 1. **Auth Module**
- **Responsibility**: User authentication and authorization
- **Components**:
  - JWT Strategy (Parent auth)
  - JWT Refresh Strategy
  - Auth Guards
  - Registration & Login services
- **Dependencies**: PrismaService, JwtService

#### 2. **Devices Module**
- **Responsibility**: Device registration and authentication
- **Components**:
  - Device registration service
  - Device token authentication
  - Device auth guard
  - Heartbeat handling
- **Dependencies**: PrismaService
- **Authentication**: X-Device-Token header

#### 3. **Telemetry Module**
- **Responsibility**: Collect and process telemetry data
- **Components**:
  - Telemetry ingestion
  - SOS alert handling
  - Queue integration
- **Dependencies**: PrismaService, BullMQ
- **Queues**: `telemetry`

#### 4. **Alerts Module**
- **Responsibility**: Alert creation and management
- **Components**:
  - Alert service
  - Heart rate monitoring
  - No movement detection
- **Dependencies**: PrismaService, BullMQ
- **Queues**: `alerts`

#### 5. **Geofence Module**
- **Responsibility**: Geofence logic and event creation
- **Components**:
  - Geofence checking (school, home)
  - Event creation
  - Distance calculations
- **Dependencies**: PrismaService, AlertsService

#### 6. **Notifications Module**
- **Responsibility**: Send notifications to parents
- **Components**:
  - Notification service
  - FCM integration
  - Notification templates
- **Dependencies**: PrismaService, FcmService, BullMQ
- **Queues**: `notifications`

#### 7. **Children Module**
- **Responsibility**: Child profile management
- **Components**:
  - CRUD operations
  - Location queries
  - Alert queries
  - School location management
- **Dependencies**: PrismaService

#### 8. **Parent Module**
- **Responsibility**: Parent profile management
- **Components**:
  - Profile CRUD
  - FCM token management
  - Notification settings
- **Dependencies**: PrismaService

#### 9. **Bus Module** (Future Expansion)
- **Responsibility**: School bus tracking
- **Components**:
  - Route management
  - Boarding/exit events
  - Skeleton for future implementation
- **Dependencies**: PrismaService

#### 10. **Workers Module**
- **Responsibility**: Background job processing
- **Components**:
  - Telemetry processor
  - Alerts processor
  - Notifications processor
- **Dependencies**: All service modules

## Data Flow

### 1. Telemetry Data Flow

```
Watch Device
     │
     │ POST /devices/telemetry
     │ X-Device-Token: xxx
     │
     ▼
DeviceAuthGuard
     │
     ▼
TelemetryController
     │
     ▼
TelemetryService
     │
     ├──► Save to Database (TelemetryPoint)
     │
     └──► Add to BullMQ Queue (telemetry)
              │
              ▼
     TelemetryProcessor (Worker)
              │
              ├──► GeofenceService.checkGeofences()
              │         │
              │         ├──► Check School Geofence
              │         │         │
              │         │         └──► Create GeofenceEvent
              │         │                   │
              │         │                   └──► Create Alert (if state changed)
              │         │
              │         └──► Check Home Geofence
              │
              ├──► AlertsService.checkHighHeartRate()
              │         │
              │         └──► Create Alert (if threshold exceeded)
              │
              └──► AlertsService.checkNoMovement()
                         │
                         └──► Create Alert (if no movement detected)
```

### 2. Alert Processing Flow

```
Alert Created
     │
     ▼
Add to BullMQ Queue (alerts)
     │
     ▼
AlertsProcessor (Worker)
     │
     ├──► Update Alert Status (SENT)
     │
     └──► NotificationsService.notifyParentAboutAlert()
              │
              ├──► Get Parent Info
              │
              ├──► Generate Notification Message
              │
              └──► Add to BullMQ Queue (notifications)
                        │
                        ▼
             NotificationsProcessor (Worker)
                        │
                        ├──► Get Parent FCM Token
                        │
                        ├──► FcmService.sendPushNotification()
                        │         │
                        │         └──► Firebase Cloud Messaging
                        │
                        └──► Update Notification Status
```

### 3. SOS Alert Flow (High Priority)

```
Watch SOS Button
     │
     │ POST /devices/sos
     │
     ▼
TelemetryController
     │
     ▼
TelemetryService.handleSOS()
     │
     ├──► Create Alert (type: SOS, severity: CRITICAL)
     │
     └──► Add to Queue with Priority 1
              │
              ▼
         Immediate Processing
              │
              └──► Parent receives push notification within seconds
```

## Database Schema Design

### Entity Relationships

```
User (1) ──── (1) ParentProfile
                        │
                        │ (1 to Many)
                        ▼
                     Child ──── (Many to Many) BusRoute
                        │
                        │ (1 to Many)
                        ├──► Device
                        │      │
                        │      │ (1 to Many)
                        │      ├──► TelemetryPoint
                        │      ├──► GeofenceEvent
                        │      ├──► Alert
                        │      └──► BusEvent
                        │
                        └──► Alert
                               │
                               └──► Notification (via Parent)
```

### Key Indexes

- `TelemetryPoint`: `(childId, timestamp DESC)` - For location queries
- `Alert`: `(childId, triggeredAt DESC)` - For alert history
- `GeofenceEvent`: `(childId, timestamp DESC)` - For geofence events
- `Device`: `(deviceToken)` - For device authentication
- `Child`: `(schoolLatitude, schoolLongitude)` - For geofence queries

## Authentication & Authorization

### Parent Authentication (JWT)

```
┌─────────────────────────────────────────────────────────┐
│  Login Request                                          │
│  POST /api/v1/auth/login                                │
│  { email, password }                                    │
└──────────────────┬──────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────┐
│  AuthService                                            │
│  1. Find user by email/phone                            │
│  2. Verify password (bcrypt)                            │
│  3. Generate JWT access token (15min)                   │
│  4. Generate JWT refresh token (7days)                  │
└──────────────────┬──────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────┐
│  Return Tokens                                          │
│  { accessToken, refreshToken, user }                    │
└─────────────────────────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────┐
│  Subsequent Requests                                    │
│  Authorization: Bearer <accessToken>                    │
└──────────────────┬──────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────┐
│  JwtAuthGuard                                           │
│  1. Extract token from header                           │
│  2. Verify token signature                              │
│  3. Check expiration                                    │
│  4. Attach user to request                              │
└─────────────────────────────────────────────────────────┘
```

### Device Authentication (Token-based)

```
┌─────────────────────────────────────────────────────────┐
│  Device Registration                                    │
│  POST /api/v1/devices/register                          │
│  { hardwareId, platform, model }                        │
└──────────────────┬──────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────┐
│  DevicesService                                         │
│  1. Check if device exists (by hardwareId)              │
│  2. Generate random device token (64 chars)             │
│  3. Save device to database                             │
└──────────────────┬──────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────┐
│  Return Device Token                                    │
│  { deviceId, deviceToken, status }                      │
└─────────────────────────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────┐
│  Subsequent Requests                                    │
│  X-Device-Token: <deviceToken>                          │
└──────────────────┬──────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────┐
│  DeviceAuthGuard                                        │
│  1. Extract token from header                           │
│  2. Find device by token                                │
│  3. Check device status (ACTIVE)                        │
│  4. Attach device to request                            │
└─────────────────────────────────────────────────────────┘
```

## Queue System (BullMQ)

### Queue Configuration

- **Connection**: Redis
- **Retry Strategy**: Exponential backoff
- **Job Priorities**: 1 (highest) to 10 (lowest)
- **Concurrency**: 5 workers per queue

### Queue Flows

#### Telemetry Queue
- **Job Type**: `process-telemetry`
- **Priority**: Normal (5)
- **Processor**: `TelemetryProcessor`
- **Processing Time**: ~100-200ms
- **Retry**: 3 attempts

#### Alerts Queue
- **Job Type**: `process-alert`
- **Priority**: Based on severity (CRITICAL=1, HIGH=2, MEDIUM=3, LOW=5)
- **Processor**: `AlertsProcessor`
- **Processing Time**: ~50-100ms
- **Retry**: 5 attempts

#### Notifications Queue
- **Job Type**: `send-notification`
- **Priority**: Based on alert severity
- **Processor**: `NotificationsProcessor`
- **Processing Time**: ~200-500ms (FCM latency)
- **Retry**: 3 attempts

## Geofencing Algorithm

### Implementation

```typescript
// Haversine Formula for distance calculation
function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
}

// Check if point is within geofence
function isPointInGeofence(
  pointLat: number,
  pointLon: number,
  centerLat: number,
  centerLon: number,
  radius: number
): boolean {
  const distance = calculateDistance(pointLat, pointLon, centerLat, centerLon);
  return distance <= radius;
}
```

### State Tracking

The system tracks geofence state changes:
- Stores last event type (ENTER/EXIT)
- Only creates events on state change
- Prevents duplicate notifications

## Scalability Considerations

### Current Architecture
- Single server deployment
- Monolithic NestJS application
- Shared Redis and PostgreSQL

### Scaling Strategies

#### Horizontal Scaling (Future)
1. **API Server**: Multiple instances behind load balancer
2. **Workers**: Separate worker processes
3. **Database**: Read replicas for queries
4. **Redis**: Redis Cluster for high availability

#### Vertical Scaling
1. Increase server resources
2. PostgreSQL connection pooling
3. Redis memory optimization

#### Caching Strategy
1. Parent profiles (5min TTL)
2. Child profiles (5min TTL)
3. Latest locations (1min TTL)
4. Device info (10min TTL)

## Performance Optimization

### Database Optimizations
- Composite indexes on frequently queried columns
- Partial indexes for active records
- Query result pagination
- Connection pooling (Prisma default)

### API Optimizations
- Response compression (gzip)
- Request validation caching
- Efficient query selection (select only needed fields)

### Worker Optimizations
- Batch processing for bulk operations
- Job priority management
- Concurrency limits

## Security Features

### Current Implementation
- Password hashing (bcrypt, 10 rounds)
- JWT with short expiration (15min)
- Refresh token rotation
- Device token authentication
- Input validation (class-validator)
- SQL injection prevention (Prisma ORM)
- CORS configuration

### Recommended Additions
- Rate limiting (express-rate-limit)
- Request throttling
- IP whitelisting for admin endpoints
- Audit logging
- Encryption at rest
- HTTPS enforcement (Caddy)

## Monitoring & Observability

### Recommended Tools
- **Application Monitoring**: New Relic, DataDog
- **Logging**: Winston + CloudWatch
- **Error Tracking**: Sentry
- **Queue Monitoring**: BullMQ Dashboard
- **Database Monitoring**: pg_stat_statements
- **Metrics**: Prometheus + Grafana

### Key Metrics to Track
- API response times
- Queue processing times
- Database query performance
- Alert delivery latency
- Push notification success rate
- Active devices count
- Error rates

## Deployment Architecture

### Docker Compose (Current)
```
┌─────────────────────────────────────────┐
│           Docker Network                │
│                                         │
│  ┌──────────┐  ┌──────────┐            │
│  │PostgreSQL│  │  Redis   │            │
│  │:5432     │  │  :6379   │            │
│  └────┬─────┘  └────┬─────┘            │
│       │             │                  │
│  ┌────┴─────────────┴─────┐            │
│  │    NestJS API          │            │
│  │    :3000               │            │
│  └────────────────────────┘            │
│                                         │
└─────────────────────────────────────────┘
```

### Production (Recommended)
```
┌─────────────────────────────────────────────────────────┐
│                    Load Balancer                        │
│                    (Caddy/Nginx)                        │
└──────────────────┬──────────────────────────────────────┘
                   │
       ┌───────────┴───────────┐
       │                       │
  ┌────▼────┐            ┌────▼────┐
  │ API #1  │            │ API #2  │
  │ :3000   │            │ :3000   │
  └────┬────┘            └────┬────┘
       │                      │
       └──────────┬───────────┘
                  │
       ┌──────────┴───────────┐
       │                      │
  ┌────▼────┐          ┌─────▼─────┐
  │PostgreSQL│         │   Redis   │
  │ Primary │         │  Cluster  │
  └────┬────┘          └───────────┘
       │
  ┌────▼────┐
  │PostgreSQL│
  │ Replica │
  └─────────┘
```

## Future Enhancements

### Phase 1: Core Improvements
- WebSocket support for real-time updates
- Advanced caching with Redis
- Rate limiting middleware
- Email notifications

### Phase 2: Features
- Bus tracking implementation
- Multiple parents per child
- Child-to-parent messaging
- Activity recognition
- Safe zone routes

### Phase 3: Advanced
- Machine learning for anomaly detection
- Predictive alerts
- Analytics dashboard
- Mobile SDK for easier integration
- GraphQL API option

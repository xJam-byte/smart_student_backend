import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';

@WebSocketGateway({
  cors: {
    origin: true, // Allow all origins for development - configure for production
    credentials: true,
  },
})
export class RealtimeGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(RealtimeGateway.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  async handleConnection(client: Socket) {
    // Frontend sends token via: io(API_URL, { auth: { token: accessToken } })
    const token =
      (client.handshake.auth as any)?.token ||
      (client.handshake.headers['authorization'] as string | undefined)?.replace(
        'Bearer ',
        '',
      );

    this.logger.debug(`Client ${client.id} connecting from ${client.handshake.address}`);

    if (!token) {
      this.logger.warn(
        `Client ${client.id} connected without token - disconnecting. Auth: ${JSON.stringify(client.handshake.auth)}`
      );
      client.emit('error', { message: 'No authentication token provided' });
      client.disconnect();
      return;
    }

    // Try JWT authentication first (for parent apps)
    try {
      const payload = this.jwtService.verify(token, {
        secret: this.configService.get('JWT_SECRET'),
      });

      // Store userId in socket data for later use
      (client.data as any).userId = payload.sub;
      (client.data as any).role = payload.role;
      (client.data as any).authType = 'jwt';

      this.logger.log(
        `✅ Client ${client.id} authenticated via JWT - User: ${payload.sub}, Role: ${payload.role}`
      );

      // Emit success event to client
      client.emit('authenticated', { userId: payload.sub });
      return;
    } catch (jwtError) {
      // JWT failed, try deviceToken authentication (for watch apps)
      this.logger.debug(`JWT verification failed for ${client.id}, trying deviceToken...`);
    }

    // Try device token authentication (for watch apps)
    try {
      const device = await this.prisma.device.findUnique({
        where: { deviceToken: token },
        include: {
          child: true,
        },
      });

      if (!device || device.status !== 'ACTIVE') {
        throw new Error('Invalid device token or device is not active');
      }

      // Store device info in socket data
      (client.data as any).deviceId = device.id;
      (client.data as any).childId = device.childId;
      (client.data as any).authType = 'device';

      this.logger.log(
        `✅ Client ${client.id} authenticated via deviceToken - Device: ${device.id}, Child: ${device.child?.firstName || 'Unknown'}`
      );

      // Emit success event to watch app
      client.emit('authenticated', {
        deviceId: device.id,
        childId: device.childId,
      });
    } catch (deviceError) {
      this.logger.error(
        `❌ Client ${client.id} authentication failed: ${deviceError.message}. Token preview: ${token.substring(0, 20)}...`
      );
      client.emit('error', {
        message: 'Authentication failed',
        error: deviceError.message,
      });
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const userId = (client.data as any)?.userId;
    const deviceId = (client.data as any)?.deviceId;
    const authType = (client.data as any)?.authType;

    if (authType === 'device') {
      this.logger.log(`Client ${client.id} disconnected - Device: ${deviceId || 'unknown'}`);
    } else {
      this.logger.log(`Client ${client.id} disconnected - User: ${userId || 'unknown'}`);
    }
  }

  /**
   * Emit new alert to all connected clients
   * Can be filtered to specific users in the future
   */
  emitNewAlert(alertDto: any) {
    this.logger.debug(`Emitting alert:new - Alert ID: ${alertDto.id}`);
    this.server.emit('alert:new', alertDto);
  }

  /**
   * Emit alert to specific user (parent)
   */
  emitAlertToParent(parentId: string, alertDto: any) {
    // Find all sockets for this parent
    const sockets = Array.from(this.server.sockets.sockets.values());
    const parentSockets = sockets.filter(
      (socket) => (socket.data as any)?.userId === parentId,
    );

    if (parentSockets.length > 0) {
      this.logger.debug(
        `Emitting alert:new to parent ${parentId} - ${parentSockets.length} connection(s)`,
      );
      parentSockets.forEach((socket) => {
        socket.emit('alert:new', alertDto);
      });
    } else {
      this.logger.debug(`Parent ${parentId} not connected - alert will not be sent via WebSocket`);
    }
  }

  /**
   * Emit geofence event
   */
  emitGeofenceEvent(geofenceDto: any) {
    this.logger.debug(`Emitting geofence:event - Child ID: ${geofenceDto.childId}`);
    this.server.emit('geofence:event', geofenceDto);
  }

  /**
   * Emit device status update
   */
  emitDeviceStatus(deviceDto: any) {
    this.logger.debug(`Emitting device:status - Device ID: ${deviceDto.id}`);
    this.server.emit('device:status', deviceDto);
  }

  /**
   * Emit location update
   */
  emitLocationUpdate(locationDto: any) {
    this.logger.debug(`Emitting location:update - Child ID: ${locationDto.childId}`);
    this.server.emit('location:update', locationDto);
  }

  /**
   * Emit command to specific device (watch)
   */
  emitCommandToDevice(deviceId: string, command: any) {
    // Find all sockets for this device
    const sockets = Array.from(this.server.sockets.sockets.values());
    const deviceSockets = sockets.filter(
      (socket) => (socket.data as any)?.deviceId === deviceId,
    );

    if (deviceSockets.length > 0) {
      this.logger.log(
        `📱 Emitting device:${deviceId}:command - ${deviceSockets.length} connection(s)`,
      );
      deviceSockets.forEach((socket) => {
        socket.emit(`device:${deviceId}:command`, command);
      });
    } else {
      this.logger.warn(
        `⚠️ Device ${deviceId} not connected - command will be available via polling`,
      );
    }
  }
}

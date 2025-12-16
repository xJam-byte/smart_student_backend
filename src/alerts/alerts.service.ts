import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { QUEUE_NAMES } from '../common/constants/queue-names';
import { AlertType, AlertSeverity } from '@prisma/client';
import { RealtimeGateway } from '../realtime/realtime.gateway';

@Injectable()
export class AlertsService {
  constructor(
    private prisma: PrismaService,
    @InjectQueue(QUEUE_NAMES.ALERTS) private alertsQueue: Queue,
    private realtimeGateway: RealtimeGateway,
  ) {}

  async createAlert(
    childId: string,
    deviceId: string,
    type: AlertType,
    severity: AlertSeverity,
    latitude?: number,
    longitude?: number,
    payload?: any,
  ) {
    const alert = await this.prisma.alert.create({
      data: {
        childId,
        deviceId,
        type,
        severity,
        status: 'NEW',
        latitude,
        longitude,
        payload,
      },
      include: {
        child: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            parentId: true,
          },
        },
        device: {
          select: {
            id: true,
            model: true,
            batteryLevel: true,
          },
        },
      },
    });

    // Emit real-time event via WebSocket to all clients (for backwards compatibility)
    this.realtimeGateway.emitNewAlert(this.formatAlertDto(alert));

    // Emit real-time event to specific parent
    if (alert.child?.parentId) {
      this.realtimeGateway.emitAlertToParent(alert.child.parentId, this.formatAlertDto(alert));
    }

    // Add to alerts queue for processing and notification
    await this.alertsQueue.add(
      'process-alert',
      {
        alertId: alert.id,
        childId,
        type,
        severity,
      },
      {
        priority: severity === 'CRITICAL' ? 1 : severity === 'HIGH' ? 2 : 3,
      },
    );

    return alert;
  }

  private formatAlertDto(alert: any) {
    return {
      id: alert.id,
      type: alert.type,
      severity: alert.severity,
      status: alert.status,
      latitude: alert.latitude,
      longitude: alert.longitude,
      payload: alert.payload,
      triggeredAt: alert.triggeredAt,
      createdAt: alert.createdAt,
      child: alert.child
        ? {
            id: alert.child.id,
            firstName: alert.child.firstName,
            lastName: alert.child.lastName,
          }
        : undefined,
      device: alert.device
        ? {
            id: alert.device.id,
            model: alert.device.model,
            batteryLevel: alert.device.batteryLevel,
          }
        : undefined,
    };
  }

  async checkHighHeartRate(childId: string, deviceId: string, heartRate: number) {
    const threshold = parseInt(process.env.HIGH_HEART_RATE_THRESHOLD || '120');

    if (heartRate > threshold) {
      // Check if there's a recent alert to avoid spam
      const recentAlert = await this.prisma.alert.findFirst({
        where: {
          childId,
          type: 'HIGH_HEART_RATE',
          triggeredAt: {
            gte: new Date(Date.now() - 5 * 60 * 1000), // Last 5 minutes
          },
        },
      });

      if (!recentAlert) {
        await this.createAlert(
          childId,
          deviceId,
          'HIGH_HEART_RATE',
          'HIGH',
          undefined,
          undefined,
          { heartRate, threshold },
        );
      }
    }
  }

  async checkNoMovement(childId: string, deviceId: string) {
    const timeout = parseInt(process.env.NO_MOVEMENT_TIMEOUT_MINUTES || '30');

    // Get latest telemetry points
    const telemetryPoints = await this.prisma.telemetryPoint.findMany({
      where: { childId, deviceId },
      orderBy: { timestamp: 'desc' },
      take: 10,
    });

    if (telemetryPoints.length < 2) return;

    // Check if device hasn't moved in the last N minutes
    const latestPoint = telemetryPoints[0];
    const oldestPoint = telemetryPoints[telemetryPoints.length - 1];

    const timeDiff = latestPoint.timestamp.getTime() - oldestPoint.timestamp.getTime();
    const minutesDiff = timeDiff / (1000 * 60);

    if (minutesDiff >= timeout) {
      // Calculate total distance moved
      let totalDistance = 0;
      for (let i = 0; i < telemetryPoints.length - 1; i++) {
        const distance = this.calculateDistance(
          telemetryPoints[i].latitude,
          telemetryPoints[i].longitude,
          telemetryPoints[i + 1].latitude,
          telemetryPoints[i + 1].longitude,
        );
        totalDistance += distance;
      }

      // If total movement is less than 10 meters
      if (totalDistance < 10) {
        const recentAlert = await this.prisma.alert.findFirst({
          where: {
            childId,
            type: 'NO_MOVEMENT',
            triggeredAt: {
              gte: new Date(Date.now() - timeout * 60 * 1000),
            },
          },
        });

        if (!recentAlert) {
          await this.createAlert(
            childId,
            deviceId,
            'NO_MOVEMENT',
            'MEDIUM',
            latestPoint.latitude,
            latestPoint.longitude,
            { minutesWithoutMovement: minutesDiff, totalDistance },
          );
        }
      }
    }
  }

  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }
}

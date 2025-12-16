import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { TelemetryDto } from './dto/telemetry.dto';
import { SosDto } from './dto/sos.dto';
import { QUEUE_NAMES } from '../common/constants/queue-names';

@Injectable()
export class TelemetryService {
  constructor(
    private prisma: PrismaService,
    @InjectQueue(QUEUE_NAMES.TELEMETRY) private telemetryQueue: Queue,
  ) {}

  async saveTelemetry(deviceId: string, telemetryDto: TelemetryDto) {
    const device = await this.prisma.device.findUnique({
      where: { id: deviceId },
      include: { child: true },
    });

    if (!device) {
      throw new NotFoundException('Device not found');
    }

    if (!device.childId) {
      throw new NotFoundException('Device is not linked to a child');
    }

    // Save telemetry point and update device info
    const [telemetryPoint] = await this.prisma.$transaction([
      this.prisma.telemetryPoint.create({
        data: {
          childId: device.childId,
          deviceId: device.id,
          latitude: telemetryDto.latitude,
          longitude: telemetryDto.longitude,
          altitude: telemetryDto.altitude,
          accuracy: telemetryDto.accuracy,
          speed: telemetryDto.speed,
          bearing: telemetryDto.bearing,
          batteryLevel: telemetryDto.batteryLevel,
          heartRate: telemetryDto.heartRate,
          stepCount: telemetryDto.stepCount,
          source: telemetryDto.source || 'GPS',
          timestamp: telemetryDto.timestamp ? new Date(telemetryDto.timestamp) : new Date(),
        },
      }),
      // Update device lastSeenAt and batteryLevel
      this.prisma.device.update({
        where: { id: device.id },
        data: {
          lastSeenAt: new Date(),
          batteryLevel: telemetryDto.batteryLevel,
          lastLatitude: telemetryDto.latitude,
          lastLongitude: telemetryDto.longitude,
        },
      }),
    ]);

    // Add to processing queue for geofence check and alerts
    await this.telemetryQueue.add('process-telemetry', {
      telemetryPointId: telemetryPoint.id,
      childId: device.childId,
      deviceId: device.id,
      latitude: telemetryDto.latitude,
      longitude: telemetryDto.longitude,
      heartRate: telemetryDto.heartRate,
    });

    return {
      success: true,
      telemetryId: telemetryPoint.id,
    };
  }

  async handleSOS(deviceId: string, sosDto: SosDto) {
    const device = await this.prisma.device.findUnique({
      where: { id: deviceId },
      include: { child: true },
    });

    if (!device || !device.childId) {
      throw new NotFoundException('Device not found or not linked to a child');
    }

    // Create SOS alert with high priority and update device info
    const [alert] = await this.prisma.$transaction([
      this.prisma.alert.create({
        data: {
          childId: device.childId,
          deviceId: device.id,
          type: 'SOS',
          severity: 'CRITICAL',
          status: 'NEW',
          latitude: sosDto.latitude,
          longitude: sosDto.longitude,
          payload: {
            message: sosDto.message,
            triggeredAt: sosDto.timestamp || new Date(),
          },
        },
      }),
      // Update device lastSeenAt and location
      this.prisma.device.update({
        where: { id: device.id },
        data: {
          lastSeenAt: new Date(),
          lastLatitude: sosDto.latitude,
          lastLongitude: sosDto.longitude,
        },
      }),
    ]);

    // Add to alerts queue for immediate processing
    await this.telemetryQueue.add(
      'process-alert',
      {
        alertId: alert.id,
        childId: device.childId,
        type: 'SOS',
        severity: 'CRITICAL',
      },
      {
        priority: 1, // Highest priority
      },
    );

    return {
      success: true,
      alertId: alert.id,
      message: 'SOS alert created and sent to parent',
    };
  }
}

import { Injectable, UnauthorizedException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDeviceDto } from './dto/register-device.dto';
import { HeartbeatDto } from './dto/heartbeat.dto';
import * as crypto from 'crypto';

@Injectable()
export class DevicesService {
  constructor(private prisma: PrismaService) {}

  async register(registerDeviceDto: RegisterDeviceDto) {
    const { hardwareId, platform, model, appVersion, osVersion } = registerDeviceDto;

    // Check if device already exists
    let device = await this.prisma.device.findUnique({
      where: { hardwareId },
    });

    if (device) {
      // Update existing device
      device = await this.prisma.device.update({
        where: { hardwareId },
        data: {
          platform,
          model,
          appVersion,
          osVersion,
          status: 'ACTIVE',
          lastSeenAt: new Date(),
        },
      });
    } else {
      // Generate device token
      const deviceToken = this.generateDeviceToken();

      // Create new device
      device = await this.prisma.device.create({
        data: {
          hardwareId,
          platform,
          model,
          appVersion,
          osVersion,
          deviceToken,
          status: 'ACTIVE',
        },
      });
    }

    return {
      deviceId: device.id,
      deviceToken: device.deviceToken,
      status: device.status,
    };
  }

  async heartbeat(deviceId: string, heartbeatDto: HeartbeatDto) {
    const device = await this.prisma.device.findUnique({
      where: { id: deviceId },
    });

    if (!device) {
      throw new NotFoundException('Device not found');
    }

    await this.prisma.device.update({
      where: { id: deviceId },
      data: {
        lastSeenAt: new Date(),
        batteryLevel: heartbeatDto.batteryLevel,
        lastLatitude: heartbeatDto.latitude,
        lastLongitude: heartbeatDto.longitude,
      },
    });

    return {
      success: true,
      timestamp: new Date(),
    };
  }

  async validateDeviceToken(deviceToken: string) {
    const device = await this.prisma.device.findUnique({
      where: { deviceToken },
      include: {
        child: true,
      },
    });

    if (!device) {
      throw new UnauthorizedException('Invalid device token');
    }

    if (device.status !== 'ACTIVE') {
      throw new UnauthorizedException('Device is not active');
    }

    return device;
  }

  async acknowledgeCommand(deviceId: string, commandId: string) {
    // Placeholder for command acknowledgment logic
    return {
      success: true,
      commandId,
      acknowledgedAt: new Date(),
    };
  }

  private generateDeviceToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  async getDeviceInfo(deviceId: string) {
    return this.prisma.device.findUnique({
      where: { id: deviceId },
      include: {
        child: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });
  }
}

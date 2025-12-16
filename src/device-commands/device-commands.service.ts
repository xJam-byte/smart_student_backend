import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { SendNotificationDto } from './dto/send-notification.dto';
import { FindDeviceDto } from './dto/find-device.dto';
import { UpdateCommandStatusDto } from './dto/update-command-status.dto';

@Injectable()
export class DeviceCommandsService {
  constructor(
    private prisma: PrismaService,
    private realtimeGateway: RealtimeGateway,
  ) {}

  /**
   * Send a notification to a child's watch
   */
  async sendNotification(parentId: string, dto: SendNotificationDto) {
    // Verify that the child belongs to the parent
    const child = await this.prisma.child.findFirst({
      where: {
        id: dto.childId,
        parentId,
        isActive: true,
      },
      include: {
        devices: {
          where: {
            status: 'ACTIVE',
          },
          orderBy: {
            lastSeenAt: 'desc',
          },
          take: 1,
        },
      },
    });

    if (!child) {
      throw new NotFoundException('Child not found or does not belong to you');
    }

    if (!child.devices || child.devices.length === 0) {
      throw new BadRequestException('No active device found for this child');
    }

    const device = child.devices[0];

    // Create command in database
    const command = await this.prisma.deviceCommand.create({
      data: {
        deviceId: device.id,
        parentId,
        type: 'NOTIFICATION',
        status: 'PENDING',
        priority: 3,
        payload: {
          title: dto.title,
          message: dto.message,
          icon: dto.icon || 'message',
        },
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      },
      include: {
        device: {
          include: {
            child: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
    });

    // Send via WebSocket in real-time
    this.emitCommandToDevice(device.id, command);

    return {
      success: true,
      commandId: command.id,
      message: 'Notification sent to device',
    };
  }

  /**
   * Send find device command
   */
  async findDevice(parentId: string, dto: FindDeviceDto) {
    const child = await this.prisma.child.findFirst({
      where: {
        id: dto.childId,
        parentId,
        isActive: true,
      },
      include: {
        devices: {
          where: {
            status: 'ACTIVE',
          },
          orderBy: {
            lastSeenAt: 'desc',
          },
          take: 1,
        },
      },
    });

    if (!child) {
      throw new NotFoundException('Child not found or does not belong to you');
    }

    if (!child.devices || child.devices.length === 0) {
      throw new BadRequestException('No active device found for this child');
    }

    const device = child.devices[0];

    const command = await this.prisma.deviceCommand.create({
      data: {
        deviceId: device.id,
        parentId,
        type: 'FIND_DEVICE',
        status: 'PENDING',
        priority: 5, // High priority
        payload: {
          duration: dto.duration || 60,
          vibrate: dto.vibrate !== false,
        },
        expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
      },
      include: {
        device: {
          include: {
            child: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
    });

    this.emitCommandToDevice(device.id, command);

    return {
      success: true,
      commandId: command.id,
      message: 'Find device command sent',
    };
  }

  /**
   * Get pending commands for a device (called by watch app)
   */
  async getPendingCommands(deviceId: string) {
    const commands = await this.prisma.deviceCommand.findMany({
      where: {
        deviceId,
        status: {
          in: ['PENDING', 'SENT'],
        },
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } },
        ],
      },
      orderBy: [
        { priority: 'desc' },
        { createdAt: 'asc' },
      ],
    });

    // Update status to SENT
    if (commands.length > 0) {
      await this.prisma.deviceCommand.updateMany({
        where: {
          id: { in: commands.map(c => c.id) },
          status: 'PENDING',
        },
        data: {
          status: 'SENT',
          sentAt: new Date(),
        },
      });
    }

    return commands;
  }

  /**
   * Update command status (called by watch app)
   */
  async updateCommandStatus(deviceId: string, dto: UpdateCommandStatusDto) {
    const command = await this.prisma.deviceCommand.findFirst({
      where: {
        id: dto.commandId,
        deviceId,
      },
    });

    if (!command) {
      throw new NotFoundException('Command not found');
    }

    const updateData: any = {
      status: dto.status,
      updatedAt: new Date(),
    };

    switch (dto.status) {
      case 'DELIVERED':
        updateData.deliveredAt = new Date();
        break;
      case 'READ':
        updateData.readAt = new Date();
        break;
      case 'EXECUTED':
        updateData.executedAt = new Date();
        break;
      case 'FAILED':
        updateData.failedAt = new Date();
        updateData.errorMessage = dto.errorMessage;
        break;
    }

    await this.prisma.deviceCommand.update({
      where: { id: dto.commandId },
      data: updateData,
    });

    return {
      success: true,
      message: 'Command status updated',
    };
  }

  /**
   * Get command history for a child
   */
  async getCommandHistory(parentId: string, childId: string, limit = 50) {
    const child = await this.prisma.child.findFirst({
      where: {
        id: childId,
        parentId,
      },
    });

    if (!child) {
      throw new NotFoundException('Child not found');
    }

    const commands = await this.prisma.deviceCommand.findMany({
      where: {
        parentId,
        device: {
          childId,
        },
      },
      include: {
        device: {
          select: {
            id: true,
            model: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
    });

    return commands;
  }

  /**
   * Emit command to device via WebSocket
   */
  private emitCommandToDevice(deviceId: string, command: any) {
    this.realtimeGateway.emitCommandToDevice(deviceId, {
      id: command.id,
      type: command.type,
      payload: command.payload,
      priority: command.priority,
      createdAt: command.createdAt,
      expiresAt: command.expiresAt,
    });
  }

  /**
   * Clean up expired commands (to be called periodically)
   */
  async cleanupExpiredCommands() {
    const result = await this.prisma.deviceCommand.updateMany({
      where: {
        status: {
          in: ['PENDING', 'SENT'],
        },
        expiresAt: {
          lt: new Date(),
        },
      },
      data: {
        status: 'EXPIRED',
        updatedAt: new Date(),
      },
    });

    return {
      expired: result.count,
    };
  }
}

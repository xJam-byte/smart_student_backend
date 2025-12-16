import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { QUEUE_NAMES } from '../common/constants/queue-names';
import { NotificationType } from '@prisma/client';

@Injectable()
export class NotificationsService {
  constructor(
    private prisma: PrismaService,
    @InjectQueue(QUEUE_NAMES.NOTIFICATIONS) private notificationsQueue: Queue,
  ) {}

  async createNotification(
    parentId: string,
    type: NotificationType,
    title: string,
    body: string,
    payload?: any,
  ) {
    const notification = await this.prisma.notification.create({
      data: {
        parentId,
        type,
        title,
        body,
        payload,
        channel: 'PUSH',
        status: 'PENDING',
      },
    });

    // Add to notifications queue
    await this.notificationsQueue.add('send-notification', {
      notificationId: notification.id,
      parentId,
      title,
      body,
      payload,
    });

    return notification;
  }

  async getNotifications(userId: string, limit: number = 50) {
    const parentProfile = await this.prisma.parentProfile.findUnique({
      where: { userId },
    });

    if (!parentProfile) {
      return [];
    }

    return this.prisma.notification.findMany({
      where: { parentId: parentProfile.id },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  async markAsRead(userId: string, notificationIds: string[]) {
    const parentProfile = await this.prisma.parentProfile.findUnique({
      where: { userId },
    });

    if (!parentProfile) {
      return;
    }

    await this.prisma.notification.updateMany({
      where: {
        id: { in: notificationIds },
        parentId: parentProfile.id,
      },
      data: {
        status: 'READ',
        readAt: new Date(),
      },
    });

    return { success: true, count: notificationIds.length };
  }

  async notifyParentAboutAlert(alertId: string) {
    const alert = await this.prisma.alert.findUnique({
      where: { id: alertId },
      include: {
        child: {
          include: {
            parent: true,
          },
        },
      },
    });

    if (!alert) return;

    const { child, type, severity } = alert;
    let title = '';
    let body = '';

    switch (type) {
      case 'SOS':
        title = '🆘 SOS Сигнал!';
        body = `${child.firstName} отправил сигнал SOS!`;
        break;
      case 'HIGH_HEART_RATE':
        title = '💓 Высокий пульс';
        body = `У ${child.firstName} повышенный пульс`;
        break;
      case 'NO_MOVEMENT':
        title = '⚠️ Нет движения';
        body = `${child.firstName} не двигается некоторое время`;
        break;
      case 'ENTERED_SCHOOL_ZONE':
        title = '🏫 Прибыл в школу';
        body = `${child.firstName} вошел в зону школы`;
        break;
      case 'LEFT_SCHOOL_ZONE':
        title = '🚶 Покинул школу';
        body = `${child.firstName} покинул зону школы`;
        break;
      case 'LOW_BATTERY':
        title = '🔋 Низкий заряд';
        body = `Низкий заряд батареи у часов ${child.firstName}`;
        break;
      case 'DEVICE_OFFLINE':
        title = '📵 Устройство офлайн';
        body = `Часы ${child.firstName} не на связи`;
        break;
      default:
        title = 'Уведомление';
        body = `Новое уведомление для ${child.firstName}`;
    }

    await this.createNotification(child.parent.id, 'ALERT', title, body, {
      alertId,
      childId: child.id,
      severity,
      latitude: alert.latitude,
      longitude: alert.longitude,
    });
  }
}

import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { FcmService } from '../notifications/fcm.service';
import { QUEUE_NAMES } from '../common/constants/queue-names';

@Processor(QUEUE_NAMES.NOTIFICATIONS)
export class NotificationsProcessor extends WorkerHost {
  private readonly logger = new Logger(NotificationsProcessor.name);

  constructor(
    private prisma: PrismaService,
    private fcmService: FcmService,
  ) {
    super();
  }

  async process(job: Job): Promise<any> {
    this.logger.log(`Processing notification job ${job.id}`);

    const { notificationId, parentId, title, body, payload } = job.data;

    try {
      // Get parent's FCM token
      const parent = await this.prisma.parentProfile.findUnique({
        where: { id: parentId },
      });

      if (!parent || !parent.fcmToken) {
        this.logger.warn(`Parent ${parentId} has no FCM token`);
        await this.prisma.notification.update({
          where: { id: notificationId },
          data: {
            status: 'FAILED',
            sentAt: new Date(),
          },
        });
        return { success: false, reason: 'No FCM token' };
      }

      // Check if push notifications are enabled
      if (!parent.enablePushNotifications) {
        this.logger.log(`Push notifications disabled for parent ${parentId}`);
        await this.prisma.notification.update({
          where: { id: notificationId },
          data: {
            status: 'FAILED',
            sentAt: new Date(),
          },
        });
        return { success: false, reason: 'Push notifications disabled' };
      }

      // Send FCM notification
      const sent = await this.fcmService.sendPushNotification(
        parent.fcmToken,
        title,
        body,
        payload ? JSON.parse(JSON.stringify(payload)) : undefined,
      );

      // Update notification status
      await this.prisma.notification.update({
        where: { id: notificationId },
        data: {
          status: sent ? 'SENT' : 'FAILED',
          sentAt: new Date(),
        },
      });

      this.logger.log(`Notification ${notificationId} sent: ${sent}`);

      return { success: sent, notificationId };
    } catch (error) {
      this.logger.error(
        `Error sending notification ${notificationId}: ${error.message}`,
        error.stack,
      );

      await this.prisma.notification.update({
        where: { id: notificationId },
        data: {
          status: 'FAILED',
          sentAt: new Date(),
        },
      });

      throw error;
    }
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job) {
    this.logger.debug(`Notification job ${job.id} completed`);
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job, error: Error) {
    this.logger.error(`Notification job ${job.id} failed: ${error.message}`, error.stack);
  }
}

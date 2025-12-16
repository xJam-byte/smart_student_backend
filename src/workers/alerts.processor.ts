import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { QUEUE_NAMES } from '../common/constants/queue-names';

@Processor(QUEUE_NAMES.ALERTS)
export class AlertsProcessor extends WorkerHost {
  private readonly logger = new Logger(AlertsProcessor.name);

  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
  ) {
    super();
  }

  async process(job: Job): Promise<any> {
    this.logger.log(`Processing alert job ${job.id}`);

    const { alertId, childId, type, severity } = job.data;

    try {
      // Mark alert as sent
      await this.prisma.alert.update({
        where: { id: alertId },
        data: {
          status: 'SENT',
          sentAt: new Date(),
        },
      });

      // Send notification to parent
      await this.notificationsService.notifyParentAboutAlert(alertId);

      this.logger.log(`Alert ${alertId} processed and notification sent`);

      return { success: true, alertId };
    } catch (error) {
      this.logger.error(`Error processing alert ${alertId}: ${error.message}`, error.stack);
      throw error;
    }
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job) {
    this.logger.debug(`Alert job ${job.id} completed`);
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job, error: Error) {
    this.logger.error(`Alert job ${job.id} failed: ${error.message}`, error.stack);
  }
}

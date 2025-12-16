import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { GeofenceService } from '../geofence/geofence.service';
import { AlertsService } from '../alerts/alerts.service';
import { QUEUE_NAMES } from '../common/constants/queue-names';

@Processor(QUEUE_NAMES.TELEMETRY)
export class TelemetryProcessor extends WorkerHost {
  private readonly logger = new Logger(TelemetryProcessor.name);

  constructor(
    private geofenceService: GeofenceService,
    private alertsService: AlertsService,
  ) {
    super();
  }

  async process(job: Job): Promise<any> {
    this.logger.log(`Processing job ${job.id} of type ${job.name}`);

    switch (job.name) {
      case 'process-telemetry':
        return this.processTelemetry(job.data);
      case 'process-alert':
        return this.processAlert(job.data);
      default:
        this.logger.warn(`Unknown job type: ${job.name}`);
    }
  }

  private async processTelemetry(data: any) {
    const { childId, deviceId, latitude, longitude, heartRate } = data;

    try {
      // Check geofences
      await this.geofenceService.checkGeofences(childId, deviceId, latitude, longitude);

      // Check heart rate alerts
      if (heartRate) {
        await this.alertsService.checkHighHeartRate(childId, deviceId, heartRate);
      }

      // Check for no movement
      await this.alertsService.checkNoMovement(childId, deviceId);

      this.logger.log(`Telemetry processed for child ${childId}`);
    } catch (error) {
      this.logger.error(`Error processing telemetry: ${error.message}`, error.stack);
      throw error;
    }
  }

  private async processAlert(data: any) {
    this.logger.log(`Processing alert ${data.alertId}`);
    // Alert processing is handled in alerts.processor
    // This is just a placeholder for telemetry-related alerts
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job) {
    this.logger.debug(`Job ${job.id} completed`);
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job, error: Error) {
    this.logger.error(`Job ${job.id} failed: ${error.message}`, error.stack);
  }
}

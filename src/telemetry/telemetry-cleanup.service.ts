import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class TelemetryCleanupService {
  private readonly logger = new Logger(TelemetryCleanupService.name);
  private readonly retentionDays: number;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {
    this.retentionDays = parseInt(
      this.configService.get('TELEMETRY_RETENTION_DAYS', '10'),
      10,
    );
    this.logger.log(
      `TelemetryCleanupService initialized with ${this.retentionDays} days retention`,
    );
  }

  /**
   * Runs every day at 3 AM to clean up old telemetry data
   * Deletes telemetry points older than TELEMETRY_RETENTION_DAYS
   */
  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async cleanupOldTelemetry() {
    this.logger.log('Starting telemetry cleanup task...');

    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - this.retentionDays);

      this.logger.log(
        `Deleting telemetry points older than ${cutoffDate.toISOString()}`,
      );

      const result = await this.prisma.telemetryPoint.deleteMany({
        where: {
          timestamp: {
            lt: cutoffDate,
          },
        },
      });

      this.logger.log(
        `Successfully deleted ${result.count} old telemetry points`,
      );

      // Log cleanup stats
      const remainingCount = await this.prisma.telemetryPoint.count();
      this.logger.log(`Remaining telemetry points in database: ${remainingCount}`);

      return {
        success: true,
        deletedCount: result.count,
        remainingCount,
        cutoffDate: cutoffDate.toISOString(),
      };
    } catch (error) {
      this.logger.error('Error during telemetry cleanup:', error);
      throw error;
    }
  }

  /**
   * Manual cleanup method that can be called on-demand
   * @param daysToRetain Optional override for retention period
   */
  async manualCleanup(daysToRetain?: number) {
    const days = daysToRetain || this.retentionDays;
    this.logger.log(`Manual cleanup triggered with ${days} days retention`);

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const result = await this.prisma.telemetryPoint.deleteMany({
      where: {
        timestamp: {
          lt: cutoffDate,
        },
      },
    });

    this.logger.log(
      `Manual cleanup: deleted ${result.count} telemetry points`,
    );

    return {
      success: true,
      deletedCount: result.count,
      cutoffDate: cutoffDate.toISOString(),
    };
  }

  /**
   * Get cleanup statistics
   */
  async getCleanupStats() {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.retentionDays);

    const [totalCount, oldCount, recentCount] = await Promise.all([
      this.prisma.telemetryPoint.count(),
      this.prisma.telemetryPoint.count({
        where: {
          timestamp: {
            lt: cutoffDate,
          },
        },
      }),
      this.prisma.telemetryPoint.count({
        where: {
          timestamp: {
            gte: cutoffDate,
          },
        },
      }),
    ]);

    return {
      totalCount,
      oldCount,
      recentCount,
      retentionDays: this.retentionDays,
      cutoffDate: cutoffDate.toISOString(),
    };
  }
}

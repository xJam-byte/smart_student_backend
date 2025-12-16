import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AlertsService } from '../alerts/alerts.service';
import { isPointInGeofence } from '../common/utils/geolocation.util';

// Configuration constants
const VALIDATION_POINTS_COUNT = 3; // Number of recent points to check
const MAX_ACCURACY_METERS = 50; // Ignore points with worse accuracy
const MIN_EVENT_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes anti-spam

@Injectable()
export class GeofenceService {
  private readonly logger = new Logger(GeofenceService.name);

  constructor(
    private prisma: PrismaService,
    private alertsService: AlertsService,
  ) {}

  async checkGeofences(childId: string, deviceId: string, latitude: number, longitude: number) {
    const child = await this.prisma.child.findUnique({
      where: { id: childId },
    });

    if (!child) return;

    // Check school geofence
    if (child.schoolLatitude && child.schoolLongitude) {
      await this.checkSchoolGeofence(child, deviceId, latitude, longitude);
    }

    // Check home geofence (optional - can be enabled later)
    if (child.homeLatitude && child.homeLongitude) {
      await this.checkHomeGeofence(child, deviceId, latitude, longitude);
    }
  }

  private async checkSchoolGeofence(
    child: any,
    deviceId: string,
    latitude: number,
    longitude: number,
  ) {
    // Current state: is point inside school geofence?
    const isInSchoolNow = isPointInGeofence(
      latitude,
      longitude,
      child.schoolLatitude,
      child.schoolLongitude,
      child.schoolGeofenceRadius,
    );

    // Previous state: read from child.isInSchool flag
    const wasInSchool = child.isInSchool;

    // If state hasn't changed, no action needed
    if (isInSchoolNow === wasInSchool) {
      return;
    }

    // State has potentially changed - validate with recent points
    const isStateChangeConfirmed = await this.validateStateChange(
      child.id,
      isInSchoolNow,
      child.schoolLatitude,
      child.schoolLongitude,
      child.schoolGeofenceRadius,
    );

    if (!isStateChangeConfirmed) {
      this.logger.debug(
        `State change not confirmed for child ${child.id} - not enough validation points`,
      );
      return;
    }

    // Check anti-spam: has enough time passed since last similar event?
    const eventType = isInSchoolNow ? 'ENTER_SCHOOL' : 'EXIT_SCHOOL';
    const canCreateEvent = await this.canCreateEvent(child.id, eventType);

    if (!canCreateEvent) {
      this.logger.debug(`Anti-spam: skipping ${eventType} event for child ${child.id}`);
      return;
    }

    // All checks passed - update state and create events
    await this.updateSchoolState(child.id, deviceId, isInSchoolNow, latitude, longitude);
  }

  private async checkHomeGeofence(
    child: any,
    deviceId: string,
    latitude: number,
    longitude: number,
  ) {
    const isAtHomeNow = isPointInGeofence(
      latitude,
      longitude,
      child.homeLatitude,
      child.homeLongitude,
      child.homeGeofenceRadius,
    );

    const wasAtHome = child.isAtHome;

    if (isAtHomeNow === wasAtHome) {
      return;
    }

    // Validate state change with recent points
    const isStateChangeConfirmed = await this.validateStateChange(
      child.id,
      isAtHomeNow,
      child.homeLatitude,
      child.homeLongitude,
      child.homeGeofenceRadius,
    );

    if (!isStateChangeConfirmed) {
      return;
    }

    // Check anti-spam
    const eventType = isAtHomeNow ? 'ENTER_HOME' : 'EXIT_HOME';
    const canCreateEvent = await this.canCreateEvent(child.id, eventType);

    if (!canCreateEvent) {
      this.logger.debug(`Anti-spam: skipping ${eventType} event for child ${child.id}`);
      return;
    }

    // Update state and create events
    await this.updateHomeState(child.id, deviceId, isAtHomeNow, latitude, longitude);
  }

  /**
   * Validates state change by checking last N telemetry points
   * Returns true if majority of recent points confirm the new state
   */
  private async validateStateChange(
    childId: string,
    newState: boolean,
    geofenceLat: number,
    geofenceLng: number,
    geofenceRadius: number,
  ): Promise<boolean> {
    // Get last N telemetry points
    const recentPoints = await this.prisma.telemetryPoint.findMany({
      where: {
        childId,
        accuracy: {
          lte: MAX_ACCURACY_METERS, // Only use accurate points
        },
      },
      orderBy: {
        timestamp: 'desc',
      },
      take: VALIDATION_POINTS_COUNT,
    });

    // If we don't have enough points, allow the change (first-time scenario)
    if (recentPoints.length < 2) {
      return true;
    }

    // Count how many points are in the new state
    let pointsInNewState = 0;

    for (const point of recentPoints) {
      const isInside = isPointInGeofence(
        point.latitude,
        point.longitude,
        geofenceLat,
        geofenceLng,
        geofenceRadius,
      );

      if (isInside === newState) {
        pointsInNewState++;
      }
    }

    // Require majority (> 50%) to confirm state change
    const confirmationThreshold = Math.ceil(recentPoints.length / 2);
    const isConfirmed = pointsInNewState >= confirmationThreshold;

    this.logger.debug(
      `State validation: ${pointsInNewState}/${recentPoints.length} points confirm new state (threshold: ${confirmationThreshold})`,
    );

    return isConfirmed;
  }

  /**
   * Anti-spam: checks if enough time has passed since last similar event
   */
  private async canCreateEvent(
    childId: string,
    eventType: 'ENTER_SCHOOL' | 'EXIT_SCHOOL' | 'ENTER_HOME' | 'EXIT_HOME',
  ): Promise<boolean> {
    const lastEvent = await this.prisma.geofenceEvent.findFirst({
      where: {
        childId,
        type: eventType,
      },
      orderBy: {
        timestamp: 'desc',
      },
    });

    if (!lastEvent) {
      return true; // No previous event, allow
    }

    const timeSinceLastEvent = Date.now() - lastEvent.timestamp.getTime();
    return timeSinceLastEvent >= MIN_EVENT_INTERVAL_MS;
  }

  /**
   * Updates school state and creates events/alerts
   */
  private async updateSchoolState(
    childId: string,
    deviceId: string,
    isInSchool: boolean,
    latitude: number,
    longitude: number,
  ) {
    const eventType = isInSchool ? 'ENTER_SCHOOL' : 'EXIT_SCHOOL';
    const alertType = isInSchool ? 'ENTERED_SCHOOL_ZONE' : 'LEFT_SCHOOL_ZONE';
    const alertSeverity = isInSchool ? 'LOW' : 'MEDIUM';

    this.logger.log(`Child ${childId} ${isInSchool ? 'entered' : 'left'} school zone`);

    // Update child and device states, create event and alert in a transaction
    await this.prisma.$transaction([
      // Update child state flag
      this.prisma.child.update({
        where: { id: childId },
        data: { isInSchool },
      }),
      // Update device state flag
      this.prisma.device.update({
        where: { id: deviceId },
        data: { lastInSchool: isInSchool },
      }),
      // Create geofence event
      this.prisma.geofenceEvent.create({
        data: {
          childId,
          deviceId,
          type: eventType,
          latitude,
          longitude,
        },
      }),
    ]);

    // Create alert (not in transaction to avoid blocking)
    await this.alertsService.createAlert(
      childId,
      deviceId,
      alertType,
      alertSeverity,
      latitude,
      longitude,
    );
  }

  /**
   * Updates home state and creates events
   */
  private async updateHomeState(
    childId: string,
    deviceId: string,
    isAtHome: boolean,
    latitude: number,
    longitude: number,
  ) {
    const eventType = isAtHome ? 'ENTER_HOME' : 'EXIT_HOME';

    this.logger.log(`Child ${childId} ${isAtHome ? 'entered' : 'left'} home zone`);

    // Update child and device states, create event
    await this.prisma.$transaction([
      // Update child state flag
      this.prisma.child.update({
        where: { id: childId },
        data: { isAtHome },
      }),
      // Update device state flag
      this.prisma.device.update({
        where: { id: deviceId },
        data: { lastAtHome: isAtHome },
      }),
      // Create geofence event
      this.prisma.geofenceEvent.create({
        data: {
          childId,
          deviceId,
          type: eventType,
          latitude,
          longitude,
        },
      }),
    ]);
  }
}

import { Module } from '@nestjs/common';
import { GeofenceService } from './geofence.service';
import { AlertsModule } from '../alerts/alerts.module';

@Module({
  imports: [AlertsModule],
  providers: [GeofenceService],
  exports: [GeofenceService],
})
export class GeofenceModule {}

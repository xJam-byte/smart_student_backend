import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { DevicesService } from '../devices.service';

@Injectable()
export class DeviceAuthGuard implements CanActivate {
  constructor(private devicesService: DevicesService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const deviceToken = request.headers['x-device-token'];

    if (!deviceToken) {
      throw new UnauthorizedException('Device token is required');
    }

    try {
      const device = await this.devicesService.validateDeviceToken(deviceToken);
      request.device = device;
      return true;
    } catch (error) {
      throw new UnauthorizedException('Invalid device token');
    }
  }
}

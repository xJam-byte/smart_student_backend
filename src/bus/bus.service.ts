import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBusRouteDto } from './dto/create-bus-route.dto';
import { UpdateBusRouteDto } from './dto/update-bus-route.dto';

/**
 * Bus module - Future expansion for school bus tracking
 *
 * This module provides a skeleton for bus route and event tracking.
 * Implementation can be expanded to include:
 * - Real-time bus tracking
 * - ETA calculations
 * - Automatic child boarding/exit detection
 * - Parent notifications for bus arrivals
 * - Route optimization
 */
@Injectable()
export class BusService {
  constructor(private prisma: PrismaService) {}

  async createRoute(createBusRouteDto: CreateBusRouteDto) {
    return this.prisma.busRoute.create({
      data: {
        name: createBusRouteDto.name,
        description: createBusRouteDto.description,
        coordinates: createBusRouteDto.coordinates,
        scheduleDays: createBusRouteDto.scheduleDays,
        isActive: true,
      },
    });
  }

  async findAllRoutes() {
    return this.prisma.busRoute.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOneRoute(id: string) {
    const route = await this.prisma.busRoute.findUnique({
      where: { id },
      include: {
        children: true,
        busEvents: {
          orderBy: { timestamp: 'desc' },
          take: 20,
        },
      },
    });

    if (!route) {
      throw new NotFoundException('Bus route not found');
    }

    return route;
  }

  async updateRoute(id: string, updateBusRouteDto: UpdateBusRouteDto) {
    const route = await this.prisma.busRoute.findUnique({
      where: { id },
    });

    if (!route) {
      throw new NotFoundException('Bus route not found');
    }

    return this.prisma.busRoute.update({
      where: { id },
      data: updateBusRouteDto,
    });
  }

  async removeRoute(id: string) {
    const route = await this.prisma.busRoute.findUnique({
      where: { id },
    });

    if (!route) {
      throw new NotFoundException('Bus route not found');
    }

    // Soft delete
    return this.prisma.busRoute.update({
      where: { id },
      data: { isActive: false },
    });
  }

  async getRouteEvents(routeId: string, limit: number = 50) {
    return this.prisma.busEvent.findMany({
      where: { routeId },
      orderBy: { timestamp: 'desc' },
      take: limit,
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

  /**
   * Future: Method to record child boarding the bus
   * This would be called when the device is detected near the bus
   */
  async recordBoardingEvent(
    childId: string,
    deviceId: string,
    routeId: string,
    latitude: number,
    longitude: number,
  ) {
    return this.prisma.busEvent.create({
      data: {
        childId,
        deviceId,
        routeId,
        type: 'ENTER_BUS',
        latitude,
        longitude,
      },
    });
  }

  /**
   * Future: Method to record child exiting the bus
   */
  async recordExitEvent(
    childId: string,
    deviceId: string,
    routeId: string,
    latitude: number,
    longitude: number,
  ) {
    return this.prisma.busEvent.create({
      data: {
        childId,
        deviceId,
        routeId,
        type: 'EXIT_BUS',
        latitude,
        longitude,
      },
    });
  }
}

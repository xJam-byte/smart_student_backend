import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateChildDto } from './dto/create-child.dto';
import { UpdateChildDto } from './dto/update-child.dto';
import { UpdateSchoolLocationDto } from './dto/update-school-location.dto';

@Injectable()
export class ChildrenService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, createChildDto: CreateChildDto) {
    // Get parent profile
    const parentProfile = await this.prisma.parentProfile.findUnique({
      where: { userId },
    });

    if (!parentProfile) {
      throw new NotFoundException('Parent profile not found');
    }

    return this.prisma.child.create({
      data: {
        parentId: parentProfile.id,
        ...createChildDto,
      },
    });
  }

  async findAll(userId: string) {
    const parentProfile = await this.prisma.parentProfile.findUnique({
      where: { userId },
    });

    if (!parentProfile) {
      throw new NotFoundException('Parent profile not found');
    }

    return this.prisma.child.findMany({
      where: {
        parentId: parentProfile.id,
        isActive: true,
      },
      include: {
        devices: {
          where: { status: 'ACTIVE' },
          select: {
            id: true,
            platform: true,
            model: true,
            status: true,
            lastSeenAt: true,
            batteryLevel: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findOne(userId: string, childId: string) {
    const child = await this.prisma.child.findUnique({
      where: { id: childId },
      include: {
        parent: {
          include: {
            user: true,
          },
        },
        devices: {
          where: { status: 'ACTIVE' },
        },
      },
    });

    if (!child) {
      throw new NotFoundException('Child not found');
    }

    // Check if user is the parent
    if (child.parent.userId !== userId) {
      throw new ForbiddenException('You do not have access to this child');
    }

    return child;
  }

  async update(userId: string, childId: string, updateChildDto: UpdateChildDto) {
    // Verify ownership
    await this.findOne(userId, childId);

    return this.prisma.child.update({
      where: { id: childId },
      data: updateChildDto,
    });
  }

  async remove(userId: string, childId: string) {
    // Verify ownership
    await this.findOne(userId, childId);

    // Soft delete
    return this.prisma.child.update({
      where: { id: childId },
      data: { isActive: false },
    });
  }

  async updateSchoolLocation(
    userId: string,
    childId: string,
    updateSchoolLocationDto: UpdateSchoolLocationDto,
  ) {
    // Verify ownership
    await this.findOne(userId, childId);

    return this.prisma.child.update({
      where: { id: childId },
      data: {
        schoolLatitude: updateSchoolLocationDto.latitude,
        schoolLongitude: updateSchoolLocationDto.longitude,
        schoolGeofenceRadius: updateSchoolLocationDto.radius || 100,
      },
    });
  }

  async getSchoolLocation(userId: string, childId: string) {
    const child = await this.findOne(userId, childId);

    return {
      latitude: child.schoolLatitude,
      longitude: child.schoolLongitude,
      radius: child.schoolGeofenceRadius,
    };
  }

  async getLatestLocation(userId: string, childId: string) {
    // Verify ownership
    await this.findOne(userId, childId);

    const latestTelemetry = await this.prisma.telemetryPoint.findFirst({
      where: { childId },
      orderBy: { timestamp: 'desc' },
      include: {
        device: {
          select: {
            id: true,
            model: true,
            batteryLevel: true,
          },
        },
      },
    });

    if (!latestTelemetry) {
      throw new NotFoundException('No location data available');
    }

    return latestTelemetry;
  }

  async getLocationHistory(
    userId: string,
    childId: string,
    from?: Date,
    to?: Date,
    limit: number = 100,
  ) {
    // Verify ownership
    await this.findOne(userId, childId);

    const where: any = { childId };

    if (from || to) {
      where.timestamp = {};
      if (from) where.timestamp.gte = from;
      if (to) where.timestamp.lte = to;
    }

    return this.prisma.telemetryPoint.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      take: limit,
      select: {
        id: true,
        latitude: true,
        longitude: true,
        altitude: true,
        accuracy: true,
        speed: true,
        batteryLevel: true,
        heartRate: true,
        timestamp: true,
        source: true,
      },
    });
  }

  async getAlerts(
    userId: string,
    childId: string,
    status?: string,
    limit: number = 50,
  ) {
    // Verify ownership
    await this.findOne(userId, childId);

    const where: any = { childId };
    if (status) {
      where.status = status;
    }

    return this.prisma.alert.findMany({
      where,
      orderBy: { triggeredAt: 'desc' },
      take: limit,
    });
  }
}

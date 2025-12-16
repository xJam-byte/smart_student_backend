import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdatePushTokenDto } from './dto/update-push-token.dto';

@Injectable()
export class ParentService {
  constructor(private prisma: PrismaService) {}

  async getProfile(userId: string) {
    const profile = await this.prisma.parentProfile.findUnique({
      where: { userId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            phone: true,
            role: true,
            isActive: true,
          },
        },
        children: {
          include: {
            devices: {
              where: { status: 'ACTIVE' },
            },
          },
        },
      },
    });

    if (!profile) {
      throw new NotFoundException('Parent profile not found');
    }

    return profile;
  }

  async updateProfile(userId: string, updateProfileDto: UpdateProfileDto) {
    const profile = await this.prisma.parentProfile.findUnique({
      where: { userId },
    });

    if (!profile) {
      throw new NotFoundException('Parent profile not found');
    }

    return this.prisma.parentProfile.update({
      where: { userId },
      data: updateProfileDto,
    });
  }

  async updatePushToken(userId: string, updatePushTokenDto: UpdatePushTokenDto) {
    const profile = await this.prisma.parentProfile.findUnique({
      where: { userId },
    });

    if (!profile) {
      throw new NotFoundException('Parent profile not found');
    }

    return this.prisma.parentProfile.update({
      where: { userId },
      data: {
        fcmToken: updatePushTokenDto.token,
      },
    });
  }

  async removePushToken(userId: string) {
    const profile = await this.prisma.parentProfile.findUnique({
      where: { userId },
    });

    if (!profile) {
      throw new NotFoundException('Parent profile not found');
    }

    return this.prisma.parentProfile.update({
      where: { userId },
      data: {
        fcmToken: null,
      },
    });
  }
}

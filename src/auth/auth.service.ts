import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtPayload } from '../common/interfaces/jwt-payload.interface';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async register(registerDto: RegisterDto) {
    const { email, phone, password, firstName, lastName } = registerDto;

    // Check if user already exists
    const existingUser = await this.prisma.user.findFirst({
      where: {
        OR: [
          email ? { email } : {},
          phone ? { phone } : {},
        ],
      },
    });

    if (existingUser) {
      throw new ConflictException('User with this email or phone already exists');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user with parent profile
    const user = await this.prisma.user.create({
      data: {
        email,
        phone,
        password: hashedPassword,
        role: 'PARENT',
        parentProfile: {
          create: {
            firstName,
            lastName,
          },
        },
      },
      include: {
        parentProfile: true,
      },
    });

    // Generate tokens
    const tokens = await this.generateTokens(user.id, user.email || '', user.phone || '', user.role);

    return {
      user: {
        id: user.id,
        email: user.email,
        phone: user.phone,
        role: user.role,
        profile: user.parentProfile,
      },
      ...tokens,
    };
  }

  async login(loginDto: LoginDto) {
    const { email, phone, password } = loginDto;

    // Find user
    const user = await this.prisma.user.findFirst({
      where: {
        OR: [
          email ? { email } : {},
          phone ? { phone } : {},
        ],
      },
      include: {
        parentProfile: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Account is deactivated');
    }

    // Generate tokens
    const tokens = await this.generateTokens(user.id, user.email || '', user.phone || '', user.role);

    return {
      user: {
        id: user.id,
        email: user.email,
        phone: user.phone,
        role: user.role,
        profile: user.parentProfile,
      },
      ...tokens,
    };
  }

  async refreshTokens(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    return this.generateTokens(user.id, user.email || '', user.phone || '', user.role);
  }

  async validateUser(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        parentProfile: true,
      },
    });

    if (!user || !user.isActive) {
      return null;
    }

    return user;
  }

  private async generateTokens(
    userId: string,
    email?: string,
    phone?: string,
    role: string = 'PARENT',
  ) {
    const payload: JwtPayload = {
      sub: userId,
      email: email || undefined,
      phone: phone || undefined,
      role,
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.configService.get('JWT_SECRET'),
        expiresIn: this.configService.get('JWT_EXPIRES_IN', '15m'),
      }),
      this.jwtService.signAsync(
        { sub: userId },
        {
          secret: this.configService.get('JWT_REFRESH_SECRET'),
          expiresIn: this.configService.get('JWT_REFRESH_EXPIRES_IN', '7d'),
        },
      ),
    ]);

    return {
      accessToken,
      refreshToken,
    };
  }
}

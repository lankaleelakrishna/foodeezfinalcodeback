import { BadRequestException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { createDecipheriv } from 'crypto';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import { LoginRequestDto } from './dto/login-request.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { NotificationsService } from '../notifications/notifications.service';
import { DeliveryPartnerEntity } from '../../entities/delivery-partner.entity';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly notificationsService: NotificationsService,
    @InjectRepository(DeliveryPartnerEntity)
    private readonly partnerRepository: Repository<DeliveryPartnerEntity>,
  ) {}

  private decryptPassword(encrypted: string): string {
    const key = Buffer.from(process.env.PASSWORD_ENCRYPTION_KEY ?? '', 'hex');
    const [ivBase64, cipherBase64] = encrypted.split(':');
    if (!ivBase64 || !cipherBase64) {
      throw new BadRequestException('Invalid password format');
    }
    const iv = Buffer.from(ivBase64, 'base64');
    const ciphertext = Buffer.from(cipherBase64, 'base64');
    const decipher = createDecipheriv('aes-256-cbc', key, iv);
    return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf-8');
  }

  private async findUserByEmail(email: string) {
    const trimmed = email.trim();
    if (!trimmed) return null;
    return this.prisma.user.findFirst({
      where: { email: { equals: trimmed, mode: 'insensitive' } },
      include: { restaurant: true },
    });
  }

async validateUser(email: string, encryptedPassword: string) {
  const user = await this.findUserByEmail(email);
  if (!user) return null;

  let password: string;

  try {
    password = this.decryptPassword(encryptedPassword);
  } catch {
    password = encryptedPassword;
  }

  const valid = await bcrypt.compare(password, user.passwordHash);

  return valid ? user : null;
}

  async login(payload: LoginRequestDto) {
    const user = await this.validateUser(payload.email, payload.password);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const token = this.jwtService.sign({
      sub: user.id,
      role: user.role,
      restaurantId: user.restaurantId,
    });

    return {
      accessToken: token,
      mustChangePassword: user.mustChangePassword,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        restaurantId: user.restaurantId,
      },
    };
  }

  async requestPasswordReset(email: string) {
    const user = await this.findUserByEmail(email);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const token =
      Math.random().toString(36).slice(2, 12) + Math.random().toString(36).slice(2, 12);
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60);

    await this.prisma.user.update({
      where: { id: user.id },
      data: { passwordResetToken: token, passwordResetTokenExpiresAt: expiresAt },
    });

    await this.notificationsService.sendPasswordReset({
      email: user.email,
      phone: user.restaurant?.phone ?? '',
      resetToken: token,
    });

    return { message: 'Password reset sent' };
  }

  async listAllUsers() {
    return this.prisma.user.findMany({
      select: {
        id: true,
        email: true,
        displayName: true,
        role: true,
        isActive: true,
        createdAt: true,
        restaurant: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
async createAdminUser(payload: CreateUserDto) {
  const trimmed = payload.email.trim().toLowerCase();

  const existing = await this.prisma.user.findFirst({
    where: { email: { equals: trimmed, mode: 'insensitive' } },
  });

  if (existing) {
    throw new BadRequestException('A user with this email already exists.');
  }

  const temporaryPassword = this.generateTemporaryPassword();
  const passwordHash = await bcrypt.hash(temporaryPassword, 12);

  const user = await this.prisma.user.create({
    data: {
      displayName: payload.displayName,
      email: trimmed,
      passwordHash,
      role: payload.role as any,
      restaurantId: payload.restaurantId || null,
      mustChangePassword: true,
    },
  });

  // SEND EMAIL HERE
  await this.notificationsService.sendRestaurantCredentials({
    email: user.email,
    phone: '',
    password: temporaryPassword,
    restaurantName: 'Admin Portal',
  });

  return {
    id: user.id,
    email: user.email,
    role: user.role,
    displayName: user.displayName,
  };
}

  private generateTemporaryPassword() {
    return Math.random().toString(36).slice(-8) + 'A1!';
  }

  async partnerLogin(payload: LoginRequestDto) {
    const partner = await this.partnerRepository.findOne({
      where: { email: payload.email.trim().toLowerCase() },
    });

    if (!partner || !partner.passwordHash) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const password = this.decryptPassword(payload.password);
    const valid = await bcrypt.compare(password, partner.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const token = this.jwtService.sign({
      sub: partner.id,
      role: 'DeliveryPartner',
      partnerId: partner.id,
    });

    return {
      accessToken: token,
      partner: {
        id: partner.id,
        name: partner.name,
        email: partner.email,
        status: partner.status,
        vehicleType: partner.vehicleType,
      },
    };
  }

  async resetPassword(token: string, encryptedPassword: string) {
    const user = await this.prisma.user.findFirst({
      where: { passwordResetToken: token },
    });

    if (!user || !user.passwordResetTokenExpiresAt || user.passwordResetTokenExpiresAt < new Date()) {
      throw new BadRequestException('Invalid or expired password reset token');
    }

    const newPassword = this.decryptPassword(encryptedPassword);
    const passwordHash = await bcrypt.hash(newPassword, 12);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        passwordResetToken: null,
        passwordResetTokenExpiresAt: null,
        mustChangePassword: false,
      },
    });

    return { message: 'Password has been reset' };
  }
}
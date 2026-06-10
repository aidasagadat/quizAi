import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async me(id: string) {
    const u = await this.prisma.user.findUnique({ where: { id } });
    if (!u) return null;
    return {
      id: u.id, email: u.email, displayName: u.displayName, role: u.role,
      bio: u.bio, createdAt: u.createdAt,
    };
  }

  async updateProfile(id: string, dto: { displayName?: string; bio?: string }) {
    const data: any = {};
    if (typeof dto.displayName === 'string' && dto.displayName.trim().length >= 2) data.displayName = dto.displayName.trim();
    if (typeof dto.bio === 'string') data.bio = dto.bio.slice(0, 1000);
    const u = await this.prisma.user.update({ where: { id }, data });
    return this.me(u.id);
  }

  async changePassword(id: string, currentPassword: string, newPassword: string) {
    if (!newPassword || newPassword.length < 8) throw new BadRequestException('New password must be at least 8 characters');
    const u = await this.prisma.user.findUnique({ where: { id } });
    if (!u) throw new UnauthorizedException();
    const ok = await bcrypt.compare(currentPassword, u.passwordHash);
    if (!ok) throw new UnauthorizedException('Current password is incorrect');
    const passwordHash = await bcrypt.hash(newPassword, 10);
    await this.prisma.user.update({
      where: { id },
      data: { passwordHash, refreshTokenHash: null },
    });
    return { ok: true };
  }
}

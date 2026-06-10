import { ForbiddenException, Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

function genInviteCode(len = 6) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = '';
  for (let i = 0; i < len; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

@Injectable()
export class GroupsService {
  constructor(private prisma: PrismaService) {}

  // TEACHER
  async create(teacherId: string, name: string) {
    let code = genInviteCode();
    // Avoid collisions
    for (let i = 0; i < 5; i++) {
      const exists = await this.prisma.group.findUnique({ where: { inviteCode: code } });
      if (!exists) break;
      code = genInviteCode();
    }
    return this.prisma.group.create({ data: { teacherId, name, inviteCode: code } });
  }

  listForTeacher(teacherId: string) {
    return this.prisma.group.findMany({
      where: { teacherId },
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { members: true } } },
    });
  }

  async getForTeacher(teacherId: string, id: string) {
    const g = await this.prisma.group.findUnique({
      where: { id },
      include: { members: { include: { student: { select: { id: true, email: true, displayName: true } } } } },
    });
    if (!g) throw new NotFoundException();
    if (g.teacherId !== teacherId) throw new ForbiddenException();
    return g;
  }

  async rename(teacherId: string, id: string, name: string) {
    await this.getForTeacher(teacherId, id);
    return this.prisma.group.update({ where: { id }, data: { name } });
  }

  async remove(teacherId: string, id: string) {
    await this.getForTeacher(teacherId, id);
    await this.prisma.group.delete({ where: { id } });
    return { ok: true };
  }

  async removeMember(teacherId: string, groupId: string, studentId: string) {
    await this.getForTeacher(teacherId, groupId);
    await this.prisma.groupMembership.delete({ where: { groupId_studentId: { groupId, studentId } } }).catch(() => null);
    return { ok: true };
  }

  // STUDENT
  async joinByCode(studentId: string, code: string) {
    const group = await this.prisma.group.findUnique({ where: { inviteCode: code.trim().toUpperCase() } });
    if (!group) throw new NotFoundException('Invite code not found');
    const existing = await this.prisma.groupMembership.findUnique({ where: { groupId_studentId: { groupId: group.id, studentId } } });
    if (existing) throw new BadRequestException('You are already in this group');
    await this.prisma.groupMembership.create({ data: { groupId: group.id, studentId } });
    return { ok: true, group: { id: group.id, name: group.name } };
  }

  listForStudent(studentId: string) {
    return this.prisma.group.findMany({
      where: { members: { some: { studentId } } },
      orderBy: { createdAt: 'desc' },
      include: { teacher: { select: { displayName: true } } },
    });
  }

  async leave(studentId: string, groupId: string) {
    await this.prisma.groupMembership.delete({ where: { groupId_studentId: { groupId, studentId } } }).catch(() => null);
    return { ok: true };
  }
}

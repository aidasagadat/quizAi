import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AssignmentsService {
  constructor(private prisma: PrismaService) {}

  async create(teacherId: string, dto: { testId: string; groupIds: string[]; deadline: string; timeLimitSec?: number | null; allowRetakes?: boolean; autoSave?: boolean; }) {
    const test = await this.prisma.test.findUnique({ where: { id: dto.testId } });
    if (!test) throw new NotFoundException('Test not found');
    if (test.ownerId !== teacherId) throw new ForbiddenException();
    if (!dto.groupIds?.length) throw new BadRequestException('At least one group required');

    const groups = await this.prisma.group.findMany({ where: { id: { in: dto.groupIds } } });
    for (const g of groups) if (g.teacherId !== teacherId) throw new ForbiddenException();

    return this.prisma.assignment.create({
      data: {
        testId: dto.testId,
        deadline: new Date(dto.deadline),
        timeLimitSec: dto.timeLimitSec ?? null,
        allowRetakes: dto.allowRetakes ?? false,
        autoSave: dto.autoSave ?? true,
        groups: { create: dto.groupIds.map(gid => ({ groupId: gid })) },
      },
      include: { groups: true, test: true },
    });
  }

  listForTeacher(teacherId: string) {
    return this.prisma.assignment.findMany({
      where: { test: { ownerId: teacherId } },
      orderBy: { createdAt: 'desc' },
      include: {
        test: { select: { id: true, title: true } },
        groups: { include: { group: { select: { id: true, name: true } } } },
        _count: { select: { attempts: true } },
      },
    });
  }

  async getForTeacher(teacherId: string, id: string) {
    const a = await this.prisma.assignment.findUnique({
      where: { id },
      include: {
        test: true,
        groups: { include: { group: true } },
        attempts: { include: { student: { select: { id: true, email: true, displayName: true } } } },
      },
    });
    if (!a) throw new NotFoundException();
    if (a.test.ownerId !== teacherId) throw new ForbiddenException();
    return a;
  }

  async remove(teacherId: string, id: string) {
    const a = await this.prisma.assignment.findUnique({ where: { id }, include: { test: true } });
    if (!a) throw new NotFoundException();
    if (a.test.ownerId !== teacherId) throw new ForbiddenException();
    await this.prisma.assignment.delete({ where: { id } });
    return { ok: true };
  }

  // STUDENT — list assignments visible to me (via any group I'm in)
  async listForStudent(studentId: string) {
    const myGroupIds = (await this.prisma.groupMembership.findMany({
      where: { studentId }, select: { groupId: true },
    })).map(m => m.groupId);
    if (!myGroupIds.length) return [];

    const assignments = await this.prisma.assignment.findMany({
      where: { groups: { some: { groupId: { in: myGroupIds } } } },
      orderBy: { deadline: 'asc' },
      include: {
        test: { select: { id: true, title: true, description: true, _count: { select: { questions: true } } } },
        groups: { include: { group: { select: { id: true, name: true } } } },
        attempts: { where: { studentId }, select: { id: true, status: true, score: true, submittedAt: true } },
      },
    });
    return assignments;
  }
}

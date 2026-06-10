import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AutoSelectQuestionsDto, CreateTestDto, SetQuestionsDto, UpdateTestDto } from './tests.dto';

@Injectable()
export class TestsService {
  constructor(private prisma: PrismaService) {}

  async create(ownerId: string, dto: CreateTestDto) {
    const test = await this.prisma.test.create({
      data: { ownerId, title: dto.title, description: dto.description },
    });
    if (dto.questionIds?.length) await this.setQuestions(ownerId, test.id, { questionIds: dto.questionIds });
    return this.get(ownerId, test.id);
  }

  list(ownerId: string) {
    return this.prisma.test.findMany({
      where: { ownerId },
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { questions: true, assignments: true } } },
    });
  }

  async get(ownerId: string, id: string) {
    const t = await this.prisma.test.findUnique({
      where: { id },
      include: {
        questions: { orderBy: { order: 'asc' }, include: { question: true } },
      },
    });
    if (!t) throw new NotFoundException();
    if (t.ownerId !== ownerId) throw new ForbiddenException();
    return t;
  }

  async update(ownerId: string, id: string, dto: UpdateTestDto) {
    await this.get(ownerId, id);
    return this.prisma.test.update({ where: { id }, data: dto });
  }

  async remove(ownerId: string, id: string) {
    await this.get(ownerId, id);
    await this.prisma.test.delete({ where: { id } });
    return { ok: true };
  }

  async setQuestions(ownerId: string, id: string, dto: SetQuestionsDto) {
    await this.get(ownerId, id);
    const questions = await this.prisma.question.findMany({ where: { id: { in: dto.questionIds } } });
    for (const q of questions) if (q.ownerId !== ownerId) throw new ForbiddenException();

    await this.prisma.$transaction([
      this.prisma.testQuestion.deleteMany({ where: { testId: id } }),
      ...dto.questionIds.map((qid, idx) =>
        this.prisma.testQuestion.create({ data: { testId: id, questionId: qid, order: idx } })
      ),
    ]);
    return this.get(ownerId, id);
  }

  /** Auto-select questions by difficulty from accepted questions, optionally filtered by source/topic */
  async autoSelectQuestions(ownerId: string, id: string, dto: AutoSelectQuestionsDto) {
    await this.get(ownerId, id);

    const easyCount = dto.easyCount ?? 0;
    const mediumCount = dto.mediumCount ?? 0;
    const hardCount = dto.hardCount ?? 0;

    if (easyCount + mediumCount + hardCount === 0) {
      throw new BadRequestException('Specify at least one question count > 0');
    }

    const baseWhere = {
      ownerId,
      status: 'ACCEPTED' as const,
      ...(dto.sourceId ? { sourceId: dto.sourceId } : {}),
      ...(dto.topic ? { topic: { contains: dto.topic, mode: 'insensitive' as const } } : {}),
    };

    const [easyPool, mediumPool, hardPool] = await Promise.all([
      easyCount > 0 ? this.prisma.question.findMany({ where: { ...baseWhere, difficulty: 'EASY' }, take: easyCount * 3, orderBy: { createdAt: 'desc' } }) : [],
      mediumCount > 0 ? this.prisma.question.findMany({ where: { ...baseWhere, difficulty: 'MEDIUM' }, take: mediumCount * 3, orderBy: { createdAt: 'desc' } }) : [],
      hardCount > 0 ? this.prisma.question.findMany({ where: { ...baseWhere, difficulty: 'HARD' }, take: hardCount * 3, orderBy: { createdAt: 'desc' } }) : [],
    ]);

    const pick = (pool: any[], n: number) => {
      const shuffled = [...pool].sort(() => Math.random() - 0.5);
      return shuffled.slice(0, n);
    };

    const selected = [
      ...pick(easyPool, easyCount),
      ...pick(mediumPool, mediumCount),
      ...pick(hardPool, hardCount),
    ];

    const available = { easy: easyPool.length, medium: mediumPool.length, hard: hardPool.length };
    const needed = { easy: easyCount, medium: mediumCount, hard: hardCount };
    const warnings: string[] = [];
    if (easyPool.length < easyCount) warnings.push(`Only ${easyPool.length}/${easyCount} easy questions available`);
    if (mediumPool.length < mediumCount) warnings.push(`Only ${mediumPool.length}/${mediumCount} medium questions available`);
    if (hardPool.length < hardCount) warnings.push(`Only ${hardPool.length}/${hardCount} hard questions available`);

    const questionIds = selected.map(q => q.id);
    await this.prisma.$transaction([
      this.prisma.testQuestion.deleteMany({ where: { testId: id } }),
      ...questionIds.map((qid, idx) =>
        this.prisma.testQuestion.create({ data: { testId: id, questionId: qid, order: idx } })
      ),
    ]);

    const test = await this.get(ownerId, id);
    return { test, warnings, available, needed };
  }
}

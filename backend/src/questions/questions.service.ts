import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AiService } from '../ai/ai.service';
import { GenerateQuestionsDto, UpdateQuestionDto } from './questions.dto';

// Map Bloom levels to difficulty
function bloomToDifficulty(bloom: string): 'EASY' | 'MEDIUM' | 'HARD' {
  if (['REMEMBER', 'UNDERSTAND'].includes(bloom)) return 'EASY';
  if (['APPLY', 'ANALYZE'].includes(bloom)) return 'MEDIUM';
  return 'HARD'; // EVALUATE, CREATE
}

@Injectable()
export class QuestionsService {
  constructor(private prisma: PrismaService, private ai: AiService) {}

  async generate(ownerId: string, dto: GenerateQuestionsDto) {
    let text = dto.rawText || '';
    let sourceId: string | undefined = dto.sourceId;

    if (sourceId) {
      const src = await this.prisma.source.findUnique({ where: { id: sourceId } });
      if (!src) throw new NotFoundException('Source not found');
      if (src.ownerId !== ownerId) throw new ForbiddenException();
      text = src.rawText;
    }
    if (!text || text.trim().length < 50) {
      throw new BadRequestException('Provide at least 50 characters of source text (via sourceId or rawText)');
    }

    // Map difficulty to bloom levels if difficulty is specified
    let bloomLevels = dto.bloomLevels;
    if (dto.difficulty) {
      const difficultyBlooms: Record<string, string[]> = {
        EASY: ['REMEMBER', 'UNDERSTAND'],
        MEDIUM: ['APPLY', 'ANALYZE'],
        HARD: ['EVALUATE', 'CREATE'],
      };
      bloomLevels = difficultyBlooms[dto.difficulty] as any;
    }

    const generated = await this.ai.generate({
      text,
      count: dto.count,
      type: dto.type,
      bloomLevels: bloomLevels as any,
      topicHint: dto.topicHint,
    });

    if (!generated.length) {
      throw new BadRequestException('AI failed to produce valid questions; try again or rephrase the input.');
    }

    const created = await this.prisma.$transaction(
      generated.map(q => this.prisma.question.create({
        data: {
          ownerId,
          sourceId,
          type: q.type,
          bloomLevel: q.bloomLevel,
          stem: q.stem,
          payload: q.payload,
          explanation: q.explanation,
          topic: q.topic,
          difficulty: dto.difficulty || bloomToDifficulty(q.bloomLevel),
          status: 'DRAFT',
        },
      }))
    );
    return created;
  }

  async list(ownerId: string, opts: { status?: 'DRAFT'|'ACCEPTED'|'DISCARDED'; type?: string; bloom?: string; topic?: string; difficulty?: string; sourceId?: string }) {
    return this.prisma.question.findMany({
      where: {
        ownerId,
        ...(opts.status ? { status: opts.status } : {}),
        ...(opts.type ? { type: opts.type as any } : {}),
        ...(opts.bloom ? { bloomLevel: opts.bloom as any } : {}),
        ...(opts.topic ? { topic: { contains: opts.topic, mode: 'insensitive' } } : {}),
        ...(opts.difficulty ? { difficulty: opts.difficulty as any } : {}),
        ...(opts.sourceId ? { sourceId: opts.sourceId } : {}),
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async get(ownerId: string, id: string) {
    const q = await this.prisma.question.findUnique({ where: { id } });
    if (!q) throw new NotFoundException();
    if (q.ownerId !== ownerId) throw new ForbiddenException();
    return q;
  }

  async update(ownerId: string, id: string, dto: UpdateQuestionDto) {
    await this.get(ownerId, id);
    return this.prisma.question.update({ where: { id }, data: dto });
  }

  async remove(ownerId: string, id: string) {
    await this.get(ownerId, id);
    await this.prisma.question.delete({ where: { id } });
    return { ok: true };
  }
}

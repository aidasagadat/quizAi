import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { Question } from '@prisma/client';

function normalize(s: string) { return (s || '').toString().trim().toLowerCase(); }

function gradeOne(question: Question, response: any): { status: 'CORRECT'|'INCORRECT'|'PENDING_REVIEW'|'PARTIAL'; points: number } {
  const payload: any = question.payload;
  switch (question.type) {
    case 'MULTIPLE_CHOICE': {
      const idx = Number(response?.selectedIndex);
      if (!Number.isInteger(idx)) return { status: 'INCORRECT', points: 0 };
      return idx === payload.correctIndex ? { status: 'CORRECT', points: 1 } : { status: 'INCORRECT', points: 0 };
    }
    case 'TRUE_FALSE': {
      const val = response?.value;
      if (typeof val !== 'boolean') return { status: 'INCORRECT', points: 0 };
      return val === payload.correct ? { status: 'CORRECT', points: 1 } : { status: 'INCORRECT', points: 0 };
    }
    case 'SHORT_ANSWER':
    case 'FILL_BLANK': {
      const ans = normalize(response?.text);
      if (!ans) return { status: 'INCORRECT', points: 0 };
      const accept: string[] = (payload.acceptableAnswers || []).map(normalize);
      return accept.includes(ans) ? { status: 'CORRECT', points: 1 } : { status: 'INCORRECT', points: 0 };
    }
  }
  return { status: 'PENDING_REVIEW', points: 0 };
}

// Strip correctness info before sending questions to the student
function sanitizeForStudent(q: Question) {
  const p: any = q.payload || {};
  let safe: any = {};
  switch (q.type) {
    case 'MULTIPLE_CHOICE': safe = { options: p.options || [] }; break;
    case 'TRUE_FALSE':       safe = {}; break;
    case 'SHORT_ANSWER':     safe = {}; break;
    case 'FILL_BLANK':       safe = { template: p.template || q.stem }; break;
  }
  return { id: q.id, type: q.type, stem: q.stem, bloomLevel: q.bloomLevel, topic: q.topic, payload: safe };
}

@Injectable()
export class AttemptsService {
  constructor(private prisma: PrismaService) {}

  private async assertStudentCanAccess(studentId: string, assignmentId: string) {
    const a = await this.prisma.assignment.findUnique({
      where: { id: assignmentId },
      include: { groups: true },
    });
    if (!a) throw new NotFoundException('Assignment not found');
    const groupIds = a.groups.map(g => g.groupId);
    const member = await this.prisma.groupMembership.findFirst({ where: { studentId, groupId: { in: groupIds } } });
    if (!member) throw new ForbiddenException('Not assigned to you');
    return a;
  }

  async start(studentId: string, assignmentId: string) {
    const a = await this.assertStudentCanAccess(studentId, assignmentId);
    if (a.deadline < new Date()) throw new BadRequestException('Deadline passed');

    // If an existing IN_PROGRESS attempt exists, resume it
    const existing = await this.prisma.attempt.findFirst({
      where: { assignmentId, studentId, status: 'IN_PROGRESS' },
    });
    if (existing) return this.loadForTaking(studentId, existing.id);

    // If submitted already and retakes disabled, reject
    if (!a.allowRetakes) {
      const submitted = await this.prisma.attempt.findFirst({
        where: { assignmentId, studentId, status: { in: ['SUBMITTED', 'GRADED'] } },
      });
      if (submitted) throw new BadRequestException('Already submitted; retakes disabled');
    }

    const test = await this.prisma.test.findUnique({
      where: { id: a.testId },
      include: { questions: { include: { question: true }, orderBy: { order: 'asc' } } },
    });
    const totalPoints = test?.questions.length || 0;

    const attempt = await this.prisma.attempt.create({
      data: { assignmentId, studentId, totalPoints },
    });
    return this.loadForTaking(studentId, attempt.id);
  }

  async loadForTaking(studentId: string, attemptId: string) {
    const a = await this.prisma.attempt.findUnique({
      where: { id: attemptId },
      include: {
        assignment: {
          include: {
            test: {
              include: {
                questions: { include: { question: true }, orderBy: { order: 'asc' } },
              },
            },
          },
        },
        answers: true,
      },
    });
    if (!a) throw new NotFoundException();
    if (a.studentId !== studentId) throw new ForbiddenException();

    const limit = a.assignment.timeLimitSec;
    const startedAt = a.startedAt;
    const remainingSec = limit ? Math.max(0, limit - Math.floor((Date.now() - startedAt.getTime()) / 1000)) : null;

    return {
      attemptId: a.id,
      status: a.status,
      assignment: {
        id: a.assignmentId,
        deadline: a.assignment.deadline,
        autoSave: a.assignment.autoSave,
        timeLimitSec: limit,
      },
      test: { id: a.assignment.test.id, title: a.assignment.test.title, description: a.assignment.test.description },
      questions: a.assignment.test.questions.map(tq => sanitizeForStudent(tq.question)),
      savedAnswers: a.answers.map(an => ({ questionId: an.questionId, response: an.response })),
      startedAt,
      remainingSec,
    };
  }

  async saveAnswer(studentId: string, attemptId: string, questionId: string, response: any) {
    const a = await this.prisma.attempt.findUnique({
      where: { id: attemptId },
      include: { assignment: true },
    });
    if (!a) throw new NotFoundException();
    if (a.studentId !== studentId) throw new ForbiddenException();
    if (a.status !== 'IN_PROGRESS') throw new BadRequestException('Attempt is not in progress');

    const limit = a.assignment.timeLimitSec;
    if (limit) {
      const elapsed = Math.floor((Date.now() - a.startedAt.getTime()) / 1000);
      if (elapsed > limit) throw new BadRequestException('Time limit exceeded');
    }

    await this.prisma.attemptAnswer.upsert({
      where: { attemptId_questionId: { attemptId, questionId } },
      create: { attemptId, questionId, response, status: 'INCORRECT', points: 0 },
      update: { response },
    });
    return { ok: true };
  }

  async submit(studentId: string, attemptId: string, finalAnswers?: { questionId: string; response: any }[]) {
    const a = await this.prisma.attempt.findUnique({
      where: { id: attemptId },
      include: {
        assignment: {
          include: { test: { include: { questions: { include: { question: true } } } } },
        },
        answers: true,
      },
    });
    if (!a) throw new NotFoundException();
    if (a.studentId !== studentId) throw new ForbiddenException();
    if (a.status !== 'IN_PROGRESS') throw new BadRequestException('Already submitted');

    // Persist any final answers
    if (finalAnswers?.length) {
      for (const fa of finalAnswers) {
        await this.prisma.attemptAnswer.upsert({
          where: { attemptId_questionId: { attemptId, questionId: fa.questionId } },
          create: { attemptId, questionId: fa.questionId, response: fa.response, status: 'INCORRECT', points: 0 },
          update: { response: fa.response },
        });
      }
    }

    const allAnswers = await this.prisma.attemptAnswer.findMany({ where: { attemptId } });
    const answerMap = new Map(allAnswers.map(an => [an.questionId, an]));
    const questions = a.assignment.test.questions.map(tq => tq.question);

    let earned = 0;
    const perQuestion: { questionId: string; topic: string | null; status: string; bloom: string }[] = [];

    for (const q of questions) {
      const ans = answerMap.get(q.id);
      const graded = ans ? gradeOne(q, ans.response) : { status: 'INCORRECT' as const, points: 0 };
      earned += graded.points;
      perQuestion.push({ questionId: q.id, topic: q.topic, status: graded.status, bloom: q.bloomLevel });

      if (ans) {
        await this.prisma.attemptAnswer.update({
          where: { id: ans.id },
          data: { status: graded.status, points: graded.points },
        });
      } else {
        await this.prisma.attemptAnswer.create({
          data: { attemptId, questionId: q.id, response: {}, status: 'INCORRECT', points: 0 },
        });
      }
    }

    const totalPoints = questions.length;
    const score = totalPoints > 0 ? earned / totalPoints : 0;
    const submittedAt = new Date();
    const timeSpentSec = Math.max(1, Math.floor((submittedAt.getTime() - a.startedAt.getTime()) / 1000));

    const updated = await this.prisma.attempt.update({
      where: { id: attemptId },
      data: { status: 'GRADED', score, totalPoints, earnedPoints: earned, submittedAt, timeSpentSec },
    });

    // Build recommendations: weakest topics + weakest Bloom levels
    const topicAgg: Record<string, { correct: number; total: number }> = {};
    const bloomAgg: Record<string, { correct: number; total: number }> = {};
    for (const pq of perQuestion) {
      const t = pq.topic || 'general';
      topicAgg[t] = topicAgg[t] || { correct: 0, total: 0 };
      topicAgg[t].total++;
      if (pq.status === 'CORRECT') topicAgg[t].correct++;

      bloomAgg[pq.bloom] = bloomAgg[pq.bloom] || { correct: 0, total: 0 };
      bloomAgg[pq.bloom].total++;
      if (pq.status === 'CORRECT') bloomAgg[pq.bloom].correct++;
    }
    const weakTopics = Object.entries(topicAgg)
      .map(([topic, v]) => ({ topic, accuracy: v.correct / v.total, total: v.total }))
      .filter(t => t.accuracy < 0.7)
      .sort((a, b) => a.accuracy - b.accuracy)
      .slice(0, 5);
    const weakBlooms = Object.entries(bloomAgg)
      .map(([bloom, v]) => ({ bloom, accuracy: v.correct / v.total, total: v.total }))
      .filter(t => t.accuracy < 0.7)
      .sort((a, b) => a.accuracy - b.accuracy)
      .slice(0, 3);

    const recommendations: string[] = [];
    for (const t of weakTopics) recommendations.push(`Review topic: "${t.topic}" (${Math.round(t.accuracy * 100)}% correct)`);
    for (const b of weakBlooms) recommendations.push(`Strengthen ${b.bloom.toLowerCase()}-level thinking (${Math.round(b.accuracy * 100)}% correct)`);
    if (recommendations.length === 0) recommendations.push('Great job! Keep practicing to stay sharp.');

    return {
      attemptId: updated.id,
      score: updated.score,
      earned: updated.earnedPoints,
      total: updated.totalPoints,
      timeSpentSec: updated.timeSpentSec,
      recommendations,
    };
  }

  async getResult(studentId: string, attemptId: string) {
    const a = await this.prisma.attempt.findUnique({
      where: { id: attemptId },
      include: {
        answers: { include: { question: true } },
        assignment: { include: { test: { select: { title: true } } } },
      },
    });
    if (!a) throw new NotFoundException();
    if (a.studentId !== studentId) throw new ForbiddenException();
    return {
      id: a.id,
      status: a.status,
      score: a.score,
      earned: a.earnedPoints,
      total: a.totalPoints,
      timeSpentSec: a.timeSpentSec,
      submittedAt: a.submittedAt,
      testTitle: a.assignment.test.title,
      answers: a.answers.map(an => ({
        questionId: an.questionId,
        status: an.status,
        stem: an.question.stem,
        type: an.question.type,
        topic: an.question.topic,
        bloomLevel: an.question.bloomLevel,
        response: an.response,
        correctPayload: an.question.payload, // visible after submission
        explanation: an.question.explanation,
      })),
    };
  }

  async historyForStudent(studentId: string) {
    return this.prisma.attempt.findMany({
      where: { studentId, status: 'GRADED' },
      orderBy: { submittedAt: 'desc' },
      include: { assignment: { include: { test: { select: { title: true } } } } },
    });
  }
}

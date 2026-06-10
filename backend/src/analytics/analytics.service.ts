import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) {}

  async assignmentAnalytics(teacherId: string, assignmentId: string) {
    const a = await this.prisma.assignment.findUnique({
      where: { id: assignmentId },
      include: {
        test: { include: { questions: { include: { question: true } }, _count: { select: { questions: true } } } },
        groups: { include: { group: { include: { _count: { select: { members: true } } } } } },
        attempts: {
          include: { student: { select: { id: true, displayName: true, email: true } }, answers: { include: { question: true } } },
        },
      },
    });
    if (!a) throw new NotFoundException();
    if (a.test.ownerId !== teacherId) throw new ForbiddenException();

    const submitted = a.attempts.filter(at => at.status === 'GRADED' || at.status === 'SUBMITTED');
    const totalAssignees = a.groups.reduce((sum, g) => sum + g.group._count.members, 0);
    const completionRate = totalAssignees > 0 ? submitted.length / totalAssignees : 0;
    const averageScore = submitted.length
      ? submitted.reduce((s, at) => s + (at.score || 0), 0) / submitted.length : 0;
    const averageTimeSec = submitted.length
      ? submitted.reduce((s, at) => s + (at.timeSpentSec || 0), 0) / submitted.length : 0;

    // Distribution buckets (0-20, 20-40, 40-60, 60-80, 80-100)
    const buckets = [0, 0, 0, 0, 0];
    for (const at of submitted) {
      const pct = Math.round((at.score || 0) * 100);
      const idx = Math.min(4, Math.floor(pct / 20));
      buckets[idx]++;
    }

    // Per-question difficulty: % of submitted attempts that got it correct
    const qStats: Record<string, { stem: string; total: number; correct: number; accuracy: number }> = {};
    for (const tq of a.test.questions) qStats[tq.questionId] = { stem: tq.question.stem, total: 0, correct: 0, accuracy: 0 };
    for (const at of submitted) {
      for (const an of at.answers) {
        const r = qStats[an.questionId]; if (!r) continue;
        r.total++; if (an.status === 'CORRECT') r.correct++;
      }
    }
    for (const k of Object.keys(qStats)) qStats[k].accuracy = qStats[k].total ? qStats[k].correct / qStats[k].total : 0;

    // Per-student rollup
    const perStudent = submitted.map(at => ({
      studentId: at.student.id,
      name: at.student.displayName,
      email: at.student.email,
      score: at.score,
      timeSpentSec: at.timeSpentSec,
      submittedAt: at.submittedAt,
    }));

    // Weak topics across all submissions
    const topicAgg: Record<string, { correct: number; total: number }> = {};
    for (const at of submitted) {
      for (const an of at.answers) {
        const t = an.question.topic || 'general';
        topicAgg[t] = topicAgg[t] || { correct: 0, total: 0 };
        topicAgg[t].total++;
        if (an.status === 'CORRECT') topicAgg[t].correct++;
      }
    }
    const weakTopics = Object.entries(topicAgg).map(([topic, v]) => ({
      topic, accuracy: v.total ? v.correct / v.total : 0, total: v.total,
    })).sort((a, b) => a.accuracy - b.accuracy);

    return {
      assignmentId: a.id,
      testTitle: a.test.title,
      submissions: submitted.length,
      totalAssignees,
      completionRate,
      averageScore,
      averageTimeSec,
      scoreDistribution: { buckets, labels: ['0-20', '20-40', '40-60', '60-80', '80-100'] },
      perQuestion: Object.entries(qStats).map(([id, v]) => ({ questionId: id, stem: v.stem, accuracy: v.accuracy, total: v.total })),
      perStudent,
      weakTopics,
    };
  }

  async teacherOverview(teacherId: string) {
    const [tests, questions, sources, groups, assignments] = await Promise.all([
      this.prisma.test.count({ where: { ownerId: teacherId } }),
      this.prisma.question.count({ where: { ownerId: teacherId } }),
      this.prisma.source.count({ where: { ownerId: teacherId } }),
      this.prisma.group.count({ where: { teacherId } }),
      this.prisma.assignment.count({ where: { test: { ownerId: teacherId } } }),
    ]);

    const recentSubmissions = await this.prisma.attempt.findMany({
      where: { assignment: { test: { ownerId: teacherId } }, status: 'GRADED' },
      orderBy: { submittedAt: 'desc' },
      take: 10,
      include: {
        student: { select: { displayName: true, email: true } },
        assignment: { include: { test: { select: { title: true } } } },
      },
    });

    return {
      counts: { tests, questions, sources, groups, assignments },
      recentSubmissions: recentSubmissions.map(s => ({
        id: s.id,
        studentName: s.student.displayName,
        testTitle: s.assignment.test.title,
        score: s.score,
        submittedAt: s.submittedAt,
      })),
    };
  }

  async studentProgress(studentId: string) {
    const attempts = await this.prisma.attempt.findMany({
      where: { studentId, status: 'GRADED' },
      orderBy: { submittedAt: 'asc' },
      include: {
        answers: { include: { question: true } },
        assignment: { include: { test: { select: { title: true } } } },
      },
    });

    const timeline = attempts.map(at => ({
      attemptId: at.id, testTitle: at.assignment.test.title,
      score: at.score, submittedAt: at.submittedAt,
    }));

    const topicAgg: Record<string, { correct: number; total: number }> = {};
    const bloomAgg: Record<string, { correct: number; total: number }> = {};
    for (const at of attempts) {
      for (const an of at.answers) {
        const t = an.question.topic || 'general';
        topicAgg[t] = topicAgg[t] || { correct: 0, total: 0 };
        topicAgg[t].total++;
        if (an.status === 'CORRECT') topicAgg[t].correct++;

        const b = an.question.bloomLevel;
        bloomAgg[b] = bloomAgg[b] || { correct: 0, total: 0 };
        bloomAgg[b].total++;
        if (an.status === 'CORRECT') bloomAgg[b].correct++;
      }
    }

    const topics = Object.entries(topicAgg).map(([topic, v]) => ({ topic, accuracy: v.correct / v.total, total: v.total }));
    const strong = topics.filter(t => t.accuracy >= 0.8).sort((a,b) => b.accuracy - a.accuracy).slice(0, 5);
    const weak = topics.filter(t => t.accuracy < 0.7).sort((a,b) => a.accuracy - b.accuracy).slice(0, 5);

    return {
      attemptsCount: attempts.length,
      averageScore: attempts.length ? attempts.reduce((s, a) => s + (a.score || 0), 0) / attempts.length : 0,
      timeline,
      strongTopics: strong,
      weakTopics: weak,
      bloomBreakdown: Object.entries(bloomAgg).map(([bloom, v]) => ({ bloom, accuracy: v.correct / v.total, total: v.total })),
    };
  }
}

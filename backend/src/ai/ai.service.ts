import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';

export type AiBloomLevel = 'REMEMBER' | 'UNDERSTAND' | 'APPLY' | 'ANALYZE' | 'EVALUATE' | 'CREATE';
export type AiQuestionType = 'MULTIPLE_CHOICE' | 'TRUE_FALSE' | 'SHORT_ANSWER' | 'FILL_BLANK';

export interface GenerateParams {
  text: string;
  count: number;
  type: AiQuestionType;
  bloomLevels: AiBloomLevel[];
  topicHint?: string;
}

export interface AiGeneratedQuestion {
  type: AiQuestionType;
  bloomLevel: AiBloomLevel;
  stem: string;
  payload: any;        // shape depends on type
  explanation?: string;
  topic?: string;
}

const TYPE_INSTRUCTIONS: Record<AiQuestionType, string> = {
  MULTIPLE_CHOICE: `Generate multiple-choice questions. Each must have exactly 4 options where one is correct and three are plausible distractors. Distractors should be similar in form/length to the correct answer and reflect common misconceptions.
Each question object MUST have:
{
  "type": "MULTIPLE_CHOICE",
  "bloomLevel": "<one of REMEMBER|UNDERSTAND|APPLY|ANALYZE|EVALUATE|CREATE>",
  "stem": "<question text>",
  "payload": { "options": ["A","B","C","D"], "correctIndex": <0..3> },
  "explanation": "<why the correct answer is correct>",
  "topic": "<short topic label>"
}`,
  TRUE_FALSE: `Generate true/false questions. Avoid trivial or trick wording.
Each question object MUST have:
{
  "type": "TRUE_FALSE",
  "bloomLevel": "<level>",
  "stem": "<statement to evaluate>",
  "payload": { "correct": <true|false> },
  "explanation": "<short rationale>",
  "topic": "<short topic label>"
}`,
  SHORT_ANSWER: `Generate short-answer questions answerable in 1-5 words.
Each question object MUST have:
{
  "type": "SHORT_ANSWER",
  "bloomLevel": "<level>",
  "stem": "<question>",
  "payload": { "acceptableAnswers": ["answer1","synonym1","synonym2"] },
  "explanation": "<optional context>",
  "topic": "<short topic label>"
}`,
  FILL_BLANK: `Generate fill-in-the-blank questions. The stem MUST contain "___" where the blank goes.
Each question object MUST have:
{
  "type": "FILL_BLANK",
  "bloomLevel": "<level>",
  "stem": "<sentence with ___>",
  "payload": { "template": "<same sentence>", "acceptableAnswers": ["answer","synonym"] },
  "explanation": "<optional>",
  "topic": "<short topic label>"
}`,
};

const BLOOM_GUIDANCE = `Bloom's Taxonomy levels:
- REMEMBER: recall facts, terms, definitions.
- UNDERSTAND: explain ideas, summarize, paraphrase.
- APPLY: use information in a new situation, solve a problem.
- ANALYZE: break down, compare, distinguish, examine relationships.
- EVALUATE: justify a stance, critique, assess based on criteria.
- CREATE: produce new work, design, propose alternatives.`;

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private openai: OpenAI | null = null;
  private primaryModel: string;
  private fallbackModel: string;

  constructor(private config: ConfigService) {
    const apiKey = this.config.get<string>('OPENAI_API_KEY');
    this.primaryModel = this.config.get<string>('OPENAI_PRIMARY_MODEL') || 'gpt-4o';
    this.fallbackModel = this.config.get<string>('OPENAI_FALLBACK_MODEL') || 'gpt-4o-mini';
    if (apiKey) this.openai = new OpenAI({ apiKey });
    else this.logger.warn('OPENAI_API_KEY not set — AI generation will fail until configured');
  }

  /**
   * Segment long text into chunks that fit comfortably into the model context.
   * Splits along paragraph boundaries; targets ~3000 chars per segment.
   */
  segment(text: string, maxChars = 3000): string[] {
    const paragraphs = text.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean);
    const segments: string[] = [];
    let current = '';
    for (const p of paragraphs) {
      if ((current + '\n\n' + p).length > maxChars && current) {
        segments.push(current);
        current = p;
      } else {
        current = current ? current + '\n\n' + p : p;
      }
    }
    if (current) segments.push(current);
    return segments.length ? segments : [text.slice(0, maxChars)];
  }

  buildPrompt(params: GenerateParams, segment: string): { system: string; user: string } {
    const bloomList = params.bloomLevels.length
      ? params.bloomLevels.join(', ')
      : 'any appropriate level';
    const typeInstr = TYPE_INSTRUCTIONS[params.type];

    const system = `You are an expert educational content designer specializing in producing pedagogically sound assessment questions.
${BLOOM_GUIDANCE}

You will be given source material and must generate exactly ${params.count} questions strictly grounded in the source. Never invent facts not present in the source.

${typeInstr}

Distribute questions across these Bloom's levels: ${bloomList}.
Return ONLY valid JSON of the form: { "questions": [ ... ] }
Do not include any prose outside the JSON.`;

    const user = `Source material:
"""
${segment}
"""

${params.topicHint ? `Topic hint: ${params.topicHint}\n` : ''}Generate ${params.count} ${params.type.replace('_', ' ')} questions now.`;
    return { system, user };
  }

  async generate(params: GenerateParams): Promise<AiGeneratedQuestion[]> {
    if (!this.openai) throw new Error('OpenAI not configured. Set OPENAI_API_KEY in .env.');

    const segments = this.segment(params.text);
    // Distribute the requested count across segments
    const perSegment = Math.max(1, Math.ceil(params.count / segments.length));
    const all: AiGeneratedQuestion[] = [];

    for (const seg of segments) {
      const need = Math.min(perSegment, params.count - all.length);
      if (need <= 0) break;
      const batch = await this.generateOnce({ ...params, count: need }, seg);
      all.push(...batch);
      if (all.length >= params.count) break;
    }
    return all.slice(0, params.count);
  }

  private async generateOnce(params: GenerateParams, segment: string): Promise<AiGeneratedQuestion[]> {
    const { system, user } = this.buildPrompt(params, segment);

    const tryModel = async (model: string) => {
      const resp = await this.openai!.chat.completions.create({
        model,
        temperature: 0.7,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
      });
      return resp.choices?.[0]?.message?.content ?? '';
    };

    let raw: string | undefined;
    try {
      raw = await tryModel(this.primaryModel);
    } catch (e: any) {
      this.logger.warn(`Primary model ${this.primaryModel} failed: ${e.message}; falling back to ${this.fallbackModel}`);
      raw = await tryModel(this.fallbackModel);
    }

    const parsed = this.safeParse(raw || '{}');
    const arr = Array.isArray(parsed?.questions) ? parsed.questions : [];
    return arr.map((q: any) => this.validateQuestion(q, params.type)).filter(Boolean) as AiGeneratedQuestion[];
  }

  private safeParse(s: string): any {
    try { return JSON.parse(s); } catch {
      // Try to extract JSON block
      const m = s.match(/\{[\s\S]*\}/);
      if (m) { try { return JSON.parse(m[0]); } catch {} }
      this.logger.warn('Failed to parse AI JSON response');
      return {};
    }
  }

  private validateQuestion(q: any, expectedType: AiQuestionType): AiGeneratedQuestion | null {
    if (!q || typeof q !== 'object') return null;
    if (q.type !== expectedType) return null;
    if (typeof q.stem !== 'string' || !q.stem.trim()) return null;
    const bloom: AiBloomLevel = (['REMEMBER','UNDERSTAND','APPLY','ANALYZE','EVALUATE','CREATE'] as const)
      .includes(q.bloomLevel) ? q.bloomLevel : 'UNDERSTAND';

    switch (expectedType) {
      case 'MULTIPLE_CHOICE': {
        const opts = Array.isArray(q.payload?.options) ? q.payload.options : null;
        const idx = q.payload?.correctIndex;
        if (!opts || opts.length !== 4 || typeof idx !== 'number' || idx < 0 || idx > 3) return null;
        return { type: 'MULTIPLE_CHOICE', bloomLevel: bloom, stem: q.stem.trim(),
          payload: { options: opts.map((o: any) => String(o)), correctIndex: idx },
          explanation: q.explanation, topic: q.topic };
      }
      case 'TRUE_FALSE': {
        if (typeof q.payload?.correct !== 'boolean') return null;
        return { type: 'TRUE_FALSE', bloomLevel: bloom, stem: q.stem.trim(),
          payload: { correct: q.payload.correct }, explanation: q.explanation, topic: q.topic };
      }
      case 'SHORT_ANSWER': {
        const ans = Array.isArray(q.payload?.acceptableAnswers) ? q.payload.acceptableAnswers : null;
        if (!ans || ans.length === 0) return null;
        return { type: 'SHORT_ANSWER', bloomLevel: bloom, stem: q.stem.trim(),
          payload: { acceptableAnswers: ans.map((a: any) => String(a)) },
          explanation: q.explanation, topic: q.topic };
      }
      case 'FILL_BLANK': {
        const ans = Array.isArray(q.payload?.acceptableAnswers) ? q.payload.acceptableAnswers : null;
        const tpl = q.payload?.template || q.stem;
        if (!ans || ans.length === 0 || !String(tpl).includes('___')) return null;
        return { type: 'FILL_BLANK', bloomLevel: bloom, stem: q.stem.trim(),
          payload: { template: String(tpl), acceptableAnswers: ans.map((a: any) => String(a)) },
          explanation: q.explanation, topic: q.topic };
      }
    }
  }
}

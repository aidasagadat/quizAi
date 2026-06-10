import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as fs from 'node:fs/promises';
// @ts-ignore
import pdfParse from 'pdf-parse';
import * as mammoth from 'mammoth';

@Injectable()
export class SourcesService {
  constructor(private prisma: PrismaService) {}

  async createFromText(ownerId: string, filename: string, rawText: string) {
    const text = (rawText || '').trim();
    return this.prisma.source.create({
      data: { ownerId, filename: filename || 'pasted.txt', type: 'TEXT', rawText: text, charCount: text.length },
    });
  }

  async createFromUpload(ownerId: string, file: Express.Multer.File) {
    let rawText = '';
    let type: 'PDF' | 'DOCX' = 'PDF';
    const name = (file.originalname || '').toLowerCase();

    if (name.endsWith('.pdf') || file.mimetype === 'application/pdf') {
      const buf = await fs.readFile(file.path);
      const parsed = await pdfParse(buf);
      rawText = parsed.text || '';
      type = 'PDF';
    } else if (name.endsWith('.docx') || file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      const result = await mammoth.extractRawText({ path: file.path });
      rawText = result.value || '';
      type = 'DOCX';
    } else {
      throw new Error('Unsupported file type. Please upload PDF or DOCX.');
    }

    return this.prisma.source.create({
      data: {
        ownerId,
        filename: file.originalname,
        type,
        storagePath: file.path,
        rawText,
        charCount: rawText.length,
      },
    });
  }

  list(ownerId: string) {
    return this.prisma.source.findMany({
      where: { ownerId },
      orderBy: { createdAt: 'desc' },
      select: { id: true, filename: true, type: true, charCount: true, createdAt: true },
    });
  }

  async get(ownerId: string, id: string) {
    const src = await this.prisma.source.findUnique({ where: { id } });
    if (!src) throw new NotFoundException();
    if (src.ownerId !== ownerId) throw new ForbiddenException();
    return src;
  }

  async remove(ownerId: string, id: string) {
    const src = await this.get(ownerId, id);
    await this.prisma.source.delete({ where: { id: src.id } });
    if (src.storagePath) { try { await fs.unlink(src.storagePath); } catch {} }
    return { ok: true };
  }
}

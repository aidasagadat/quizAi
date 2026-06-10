import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import PDFDocument from 'pdfkit';
import { Document, Packer, Paragraph, HeadingLevel, TextRun } from 'docx';
import { Response } from 'express';

@Injectable()
export class ExportsService {
  constructor(private prisma: PrismaService) {}

  private async loadTest(ownerId: string, testId: string) {
    const t = await this.prisma.test.findUnique({
      where: { id: testId },
      include: { questions: { include: { question: true }, orderBy: { order: 'asc' } } },
    });
    if (!t) throw new NotFoundException();
    if (t.ownerId !== ownerId) throw new ForbiddenException();
    return t;
  }

  async exportPdf(ownerId: string, testId: string, res: Response, withAnswers = false) {
    const test = await this.loadTest(ownerId, testId);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${this.safeName(test.title)}.pdf"`);

    const doc = new PDFDocument({ size: 'A4', margin: 60 });
    doc.pipe(res);
    doc.fontSize(20).text(test.title, { align: 'center' });
    if (test.description) doc.moveDown(0.5).fontSize(11).fillColor('#555').text(test.description, { align: 'center' }).fillColor('#000');
    doc.moveDown(1.5);

    test.questions.forEach((tq, i) => {
      const q = tq.question as any;
      const p = q.payload || {};
      doc.fontSize(12).font('Helvetica-Bold').text(`${i + 1}. ${q.stem}`);
      doc.font('Helvetica').fontSize(10).fillColor('#777').text(`Type: ${q.type} | Bloom: ${q.bloomLevel}${q.topic ? ' | Topic: ' + q.topic : ''}`);
      doc.fillColor('#000').fontSize(12).moveDown(0.3);

      switch (q.type) {
        case 'MULTIPLE_CHOICE':
          (p.options || []).forEach((opt: string, idx: number) => {
            const letter = String.fromCharCode(65 + idx);
            const marker = withAnswers && idx === p.correctIndex ? '✓ ' : '  ';
            doc.text(`${marker}${letter}. ${opt}`);
          });
          break;
        case 'TRUE_FALSE':
          doc.text('☐ True    ☐ False');
          if (withAnswers) doc.fillColor('#0a0').text(`Answer: ${p.correct ? 'True' : 'False'}`).fillColor('#000');
          break;
        case 'SHORT_ANSWER':
          doc.text('Answer: _______________________________');
          if (withAnswers) doc.fillColor('#0a0').text(`Accepted: ${(p.acceptableAnswers || []).join(' / ')}`).fillColor('#000');
          break;
        case 'FILL_BLANK':
          doc.text(p.template || q.stem);
          if (withAnswers) doc.fillColor('#0a0').text(`Accepted: ${(p.acceptableAnswers || []).join(' / ')}`).fillColor('#000');
          break;
      }
      if (withAnswers && q.explanation) {
        doc.fillColor('#555').fontSize(10).text(`Explanation: ${q.explanation}`).fillColor('#000').fontSize(12);
      }
      doc.moveDown(1);
    });

    doc.end();
    await this.prisma.export.create({ data: { testId, ownerId, format: 'PDF' } });
  }

  async exportDocx(ownerId: string, testId: string, res: Response, withAnswers = false) {
    const test = await this.loadTest(ownerId, testId);

    const children: Paragraph[] = [
      new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun({ text: test.title, bold: true })] }),
    ];
    if (test.description) children.push(new Paragraph({ children: [new TextRun({ text: test.description, italics: true })] }));
    children.push(new Paragraph({ text: '' }));

    test.questions.forEach((tq, i) => {
      const q = tq.question as any;
      const p = q.payload || {};
      children.push(new Paragraph({ children: [new TextRun({ text: `${i + 1}. ${q.stem}`, bold: true })] }));
      children.push(new Paragraph({ children: [new TextRun({ text: `Type: ${q.type} | Bloom: ${q.bloomLevel}${q.topic ? ' | Topic: ' + q.topic : ''}`, italics: true, size: 18, color: '666666' })] }));

      switch (q.type) {
        case 'MULTIPLE_CHOICE':
          (p.options || []).forEach((opt: string, idx: number) => {
            const letter = String.fromCharCode(65 + idx);
            const prefix = withAnswers && idx === p.correctIndex ? '✓ ' : '   ';
            children.push(new Paragraph({ text: `${prefix}${letter}. ${opt}` }));
          });
          break;
        case 'TRUE_FALSE':
          children.push(new Paragraph({ text: '☐ True    ☐ False' }));
          if (withAnswers) children.push(new Paragraph({ children: [new TextRun({ text: `Answer: ${p.correct ? 'True' : 'False'}`, color: '008800' })] }));
          break;
        case 'SHORT_ANSWER':
          children.push(new Paragraph({ text: 'Answer: ____________________________' }));
          if (withAnswers) children.push(new Paragraph({ children: [new TextRun({ text: `Accepted: ${(p.acceptableAnswers || []).join(' / ')}`, color: '008800' })] }));
          break;
        case 'FILL_BLANK':
          children.push(new Paragraph({ text: p.template || q.stem }));
          if (withAnswers) children.push(new Paragraph({ children: [new TextRun({ text: `Accepted: ${(p.acceptableAnswers || []).join(' / ')}`, color: '008800' })] }));
          break;
      }
      if (withAnswers && q.explanation) {
        children.push(new Paragraph({ children: [new TextRun({ text: `Explanation: ${q.explanation}`, italics: true, color: '555555' })] }));
      }
      children.push(new Paragraph({ text: '' }));
    });

    const doc = new Document({ sections: [{ properties: {}, children }] });
    const buffer = await Packer.toBuffer(doc);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename="${this.safeName(test.title)}.docx"`);
    res.send(buffer);
    await this.prisma.export.create({ data: { testId, ownerId, format: 'DOCX' } });
  }

  /** Google Forms-compatible export: produces a JSON template the teacher can import via Forms add-on or use as reference. */
  async exportGoogleFormsJson(ownerId: string, testId: string) {
    const test = await this.loadTest(ownerId, testId);
    const form = {
      title: test.title,
      description: test.description || '',
      items: test.questions.map((tq, i) => {
        const q = tq.question as any;
        const p = q.payload || {};
        const base = { title: `${i + 1}. ${q.stem}`, required: true };
        switch (q.type) {
          case 'MULTIPLE_CHOICE':
            return { ...base, type: 'MULTIPLE_CHOICE', options: p.options, correctIndex: p.correctIndex };
          case 'TRUE_FALSE':
            return { ...base, type: 'MULTIPLE_CHOICE', options: ['True', 'False'], correctIndex: p.correct ? 0 : 1 };
          case 'SHORT_ANSWER':
            return { ...base, type: 'SHORT_ANSWER', acceptableAnswers: p.acceptableAnswers };
          case 'FILL_BLANK':
            return { ...base, type: 'SHORT_ANSWER', stem: p.template || q.stem, acceptableAnswers: p.acceptableAnswers };
        }
      }),
    };
    await this.prisma.export.create({ data: { testId, ownerId, format: 'GOOGLE_FORMS' } });
    return form;
  }

  private safeName(s: string) { return (s || 'quiz').replace(/[^\w.\-]+/g, '_').slice(0, 80); }
}

import {
  Body, Controller, Delete, Get, Param, Post, UploadedFile,
  UseGuards, UseInterceptors, BadRequestException
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import * as path from 'node:path';
import * as fs from 'node:fs';
import { ApiBearerAuth, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, CurrentUserPayload } from '../common/decorators/current-user.decorator';
import { SourcesService } from './sources.service';
import { IsOptional, IsString, MaxLength } from 'class-validator';

class PasteTextDto {
  @IsString()
  @MaxLength(200000)
  text!: string;

  @IsString()
  @IsOptional()
  filename?: string;
}

const uploadDir = process.env.UPLOAD_DIR || './uploads';
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

@ApiTags('sources')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('TEACHER')
@Controller('sources')
export class SourcesController {
  constructor(private sources: SourcesService) {}

  @Post('text')
  paste(@CurrentUser() u: CurrentUserPayload, @Body() dto: PasteTextDto) {
    if (!dto.text?.trim()) throw new BadRequestException('text is required');
    return this.sources.createFromText(u.id, dto.filename || 'pasted.txt', dto.text);
  }

  @Post('upload')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file', {
    storage: diskStorage({
      destination: uploadDir,
      filename: (_req, file, cb) => {
        const safe = file.originalname.replace(/[^\w.\-]+/g, '_');
        cb(null, `${Date.now()}_${safe}`);
      },
    }),
    limits: { fileSize: Number(process.env.MAX_UPLOAD_MB || 15) * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
      const ok = ['.pdf', '.docx'].some(ext => file.originalname.toLowerCase().endsWith(ext));
      cb(null, ok);
    },
  }))
  upload(@CurrentUser() u: CurrentUserPayload, @UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('Provide a .pdf or .docx file in the "file" field');
    return this.sources.createFromUpload(u.id, file);
  }

  @Get()
  list(@CurrentUser() u: CurrentUserPayload) { return this.sources.list(u.id); }

  @Get(':id')
  get(@CurrentUser() u: CurrentUserPayload, @Param('id') id: string) { return this.sources.get(u.id, id); }

  @Delete(':id')
  remove(@CurrentUser() u: CurrentUserPayload, @Param('id') id: string) { return this.sources.remove(u.id, id); }
}

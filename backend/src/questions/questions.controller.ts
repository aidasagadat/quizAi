import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, CurrentUserPayload } from '../common/decorators/current-user.decorator';
import { QuestionsService } from './questions.service';
import { GenerateQuestionsDto, UpdateQuestionDto } from './questions.dto';

@ApiTags('questions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('TEACHER')
@Controller('questions')
export class QuestionsController {
  constructor(private questions: QuestionsService) {}

  @Post('generate')
  generate(@CurrentUser() u: CurrentUserPayload, @Body() dto: GenerateQuestionsDto) {
    return this.questions.generate(u.id, dto);
  }

  @Get()
  list(@CurrentUser() u: CurrentUserPayload,
       @Query('status') status?: any,
       @Query('type') type?: string,
       @Query('bloom') bloom?: string,
       @Query('topic') topic?: string,
       @Query('difficulty') difficulty?: string,
       @Query('sourceId') sourceId?: string) {
    return this.questions.list(u.id, { status, type, bloom, topic, difficulty, sourceId });
  }

  @Get(':id')
  get(@CurrentUser() u: CurrentUserPayload, @Param('id') id: string) {
    return this.questions.get(u.id, id);
  }

  @Patch(':id')
  update(@CurrentUser() u: CurrentUserPayload, @Param('id') id: string, @Body() dto: UpdateQuestionDto) {
    return this.questions.update(u.id, id, dto);
  }

  @Delete(':id')
  remove(@CurrentUser() u: CurrentUserPayload, @Param('id') id: string) {
    return this.questions.remove(u.id, id);
  }
}

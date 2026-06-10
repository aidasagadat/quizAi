import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsArray, IsOptional, IsString } from 'class-validator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, CurrentUserPayload } from '../common/decorators/current-user.decorator';
import { AttemptsService } from './attempts.service';

class SaveAnswerDto {
  @IsString() questionId!: string;
  response!: any;
}

class SubmitDto {
  @IsOptional() @IsArray()
  answers?: { questionId: string; response: any }[];
}

@ApiTags('attempts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('STUDENT')
@Controller('attempts')
export class AttemptsController {
  constructor(private svc: AttemptsService) {}

  @Post('start/:assignmentId')
  start(@CurrentUser() u: CurrentUserPayload, @Param('assignmentId') aid: string) {
    return this.svc.start(u.id, aid);
  }

  @Post(':id/answer')
  saveAnswer(@CurrentUser() u: CurrentUserPayload, @Param('id') id: string, @Body() dto: SaveAnswerDto) {
    return this.svc.saveAnswer(u.id, id, dto.questionId, dto.response);
  }

  @Post(':id/submit')
  submit(@CurrentUser() u: CurrentUserPayload, @Param('id') id: string, @Body() dto: SubmitDto) {
    return this.svc.submit(u.id, id, dto.answers);
  }

  @Get(':id/result')
  result(@CurrentUser() u: CurrentUserPayload, @Param('id') id: string) {
    return this.svc.getResult(u.id, id);
  }

  @Get('mine/history')
  history(@CurrentUser() u: CurrentUserPayload) {
    return this.svc.historyForStudent(u.id);
  }

  @Get(':id/resume')
  resume(@CurrentUser() u: CurrentUserPayload, @Param('id') id: string) {
    return this.svc.loadForTaking(u.id, id);
  }
}

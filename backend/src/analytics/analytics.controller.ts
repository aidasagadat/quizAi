import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, CurrentUserPayload } from '../common/decorators/current-user.decorator';
import { AnalyticsService } from './analytics.service';

@ApiTags('analytics')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('analytics')
export class AnalyticsController {
  constructor(private svc: AnalyticsService) {}

  @Roles('TEACHER') @Get('overview')
  teacherOverview(@CurrentUser() u: CurrentUserPayload) { return this.svc.teacherOverview(u.id); }

  @Roles('TEACHER') @Get('assignments/:id')
  assignment(@CurrentUser() u: CurrentUserPayload, @Param('id') id: string) { return this.svc.assignmentAnalytics(u.id, id); }

  @Roles('STUDENT') @Get('me/progress')
  myProgress(@CurrentUser() u: CurrentUserPayload) { return this.svc.studentProgress(u.id); }
}

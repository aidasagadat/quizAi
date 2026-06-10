import { Controller, Get, Param, Query, Res, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, CurrentUserPayload } from '../common/decorators/current-user.decorator';
import { ExportsService } from './exports.service';

@ApiTags('exports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('TEACHER')
@Controller('exports')
export class ExportsController {
  constructor(private svc: ExportsService) {}

  @Get('tests/:id/pdf')
  pdf(@CurrentUser() u: CurrentUserPayload, @Param('id') id: string, @Query('answers') answers: string, @Res() res: Response) {
    return this.svc.exportPdf(u.id, id, res, answers === '1' || answers === 'true');
  }

  @Get('tests/:id/docx')
  docx(@CurrentUser() u: CurrentUserPayload, @Param('id') id: string, @Query('answers') answers: string, @Res() res: Response) {
    return this.svc.exportDocx(u.id, id, res, answers === '1' || answers === 'true');
  }

  @Get('tests/:id/google-forms')
  forms(@CurrentUser() u: CurrentUserPayload, @Param('id') id: string) {
    return this.svc.exportGoogleFormsJson(u.id, id);
  }
}

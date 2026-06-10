import { Body, Controller, Delete, Get, Param, Patch, Post, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, CurrentUserPayload } from '../common/decorators/current-user.decorator';
import { TestsService } from './tests.service';
import { AutoSelectQuestionsDto, CreateTestDto, SetQuestionsDto, UpdateTestDto } from './tests.dto';

@ApiTags('tests')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('TEACHER')
@Controller('tests')
export class TestsController {
  constructor(private tests: TestsService) {}

  @Post() create(@CurrentUser() u: CurrentUserPayload, @Body() dto: CreateTestDto) { return this.tests.create(u.id, dto); }
  @Get() list(@CurrentUser() u: CurrentUserPayload) { return this.tests.list(u.id); }
  @Get(':id') get(@CurrentUser() u: CurrentUserPayload, @Param('id') id: string) { return this.tests.get(u.id, id); }
  @Patch(':id') update(@CurrentUser() u: CurrentUserPayload, @Param('id') id: string, @Body() dto: UpdateTestDto) { return this.tests.update(u.id, id, dto); }
  @Delete(':id') remove(@CurrentUser() u: CurrentUserPayload, @Param('id') id: string) { return this.tests.remove(u.id, id); }
  @Put(':id/questions') setQuestions(@CurrentUser() u: CurrentUserPayload, @Param('id') id: string, @Body() dto: SetQuestionsDto) {
    return this.tests.setQuestions(u.id, id, dto);
  }
  @Post(':id/auto-select') autoSelect(@CurrentUser() u: CurrentUserPayload, @Param('id') id: string, @Body() dto: AutoSelectQuestionsDto) {
    return this.tests.autoSelectQuestions(u.id, id, dto);
  }
}

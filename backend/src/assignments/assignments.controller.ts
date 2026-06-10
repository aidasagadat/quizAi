import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ArrayMinSize, IsArray, IsBoolean, IsDateString, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, CurrentUserPayload } from '../common/decorators/current-user.decorator';
import { AssignmentsService } from './assignments.service';

class CreateAssignmentDto {
  @IsString() testId!: string;
  @IsArray() @ArrayMinSize(1) @IsString({ each: true }) groupIds!: string[];
  @IsDateString() deadline!: string;
  @IsOptional() @IsInt() @Min(30) timeLimitSec?: number | null;
  @IsOptional() @IsBoolean() allowRetakes?: boolean;
  @IsOptional() @IsBoolean() autoSave?: boolean;
}

@ApiTags('assignments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('assignments')
export class AssignmentsController {
  constructor(private svc: AssignmentsService) {}

  @Roles('TEACHER') @Post()
  create(@CurrentUser() u: CurrentUserPayload, @Body() dto: CreateAssignmentDto) { return this.svc.create(u.id, dto); }

  @Roles('TEACHER') @Get()
  listTeacher(@CurrentUser() u: CurrentUserPayload) { return this.svc.listForTeacher(u.id); }

  @Roles('TEACHER') @Get(':id')
  getTeacher(@CurrentUser() u: CurrentUserPayload, @Param('id') id: string) { return this.svc.getForTeacher(u.id, id); }

  @Roles('TEACHER') @Delete(':id')
  remove(@CurrentUser() u: CurrentUserPayload, @Param('id') id: string) { return this.svc.remove(u.id, id); }

  @Roles('STUDENT') @Get('mine/list')
  listStudent(@CurrentUser() u: CurrentUserPayload) { return this.svc.listForStudent(u.id); }
}

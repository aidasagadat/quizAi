import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, CurrentUserPayload } from '../common/decorators/current-user.decorator';
import { GroupsService } from './groups.service';

class CreateGroupDto { @IsString() @MinLength(2) name!: string; }
class RenameGroupDto { @IsString() @MinLength(2) name!: string; }
class JoinDto { @IsString() @MinLength(4) code!: string; }

@ApiTags('groups')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('groups')
export class GroupsController {
  constructor(private groups: GroupsService) {}

  // Teacher
  @Roles('TEACHER') @Post()
  create(@CurrentUser() u: CurrentUserPayload, @Body() dto: CreateGroupDto) { return this.groups.create(u.id, dto.name); }

  @Roles('TEACHER') @Get()
  listTeacher(@CurrentUser() u: CurrentUserPayload) { return this.groups.listForTeacher(u.id); }

  @Roles('TEACHER') @Get(':id')
  getTeacher(@CurrentUser() u: CurrentUserPayload, @Param('id') id: string) { return this.groups.getForTeacher(u.id, id); }

  @Roles('TEACHER') @Patch(':id')
  rename(@CurrentUser() u: CurrentUserPayload, @Param('id') id: string, @Body() dto: RenameGroupDto) {
    return this.groups.rename(u.id, id, dto.name);
  }

  @Roles('TEACHER') @Delete(':id')
  remove(@CurrentUser() u: CurrentUserPayload, @Param('id') id: string) { return this.groups.remove(u.id, id); }

  @Roles('TEACHER') @Delete(':id/members/:studentId')
  removeMember(@CurrentUser() u: CurrentUserPayload, @Param('id') id: string, @Param('studentId') sid: string) {
    return this.groups.removeMember(u.id, id, sid);
  }

  // Student
  @Roles('STUDENT') @Post('join')
  join(@CurrentUser() u: CurrentUserPayload, @Body() dto: JoinDto) { return this.groups.joinByCode(u.id, dto.code); }

  @Roles('STUDENT') @Get('mine/list')
  mine(@CurrentUser() u: CurrentUserPayload) { return this.groups.listForStudent(u.id); }

  @Roles('STUDENT') @Delete('mine/:id')
  leave(@CurrentUser() u: CurrentUserPayload, @Param('id') id: string) { return this.groups.leave(u.id, id); }
}

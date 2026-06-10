import { Body, Controller, Get, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, CurrentUserPayload } from '../common/decorators/current-user.decorator';

class UpdateProfileDto {
  @IsOptional() @IsString() @MinLength(2) @MaxLength(80)
  displayName?: string;

  @IsOptional() @IsString() @MaxLength(1000)
  bio?: string;
}

class ChangePasswordDto {
  @IsString() currentPassword!: string;
  @IsString() @MinLength(8) newPassword!: string;
}

@ApiTags('users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private users: UsersService) {}

  @Get('me')
  me(@CurrentUser() u: CurrentUserPayload) { return this.users.me(u.id); }

  @Patch('me')
  update(@CurrentUser() u: CurrentUserPayload, @Body() dto: UpdateProfileDto) {
    return this.users.updateProfile(u.id, dto);
  }

  @Post('me/change-password')
  changePassword(@CurrentUser() u: CurrentUserPayload, @Body() dto: ChangePasswordDto) {
    return this.users.changePassword(u.id, dto.currentPassword, dto.newPassword);
  }
}

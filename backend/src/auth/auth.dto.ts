import { IsEmail, IsEnum, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({ example: 'teacher@example.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'Strong#1234' })
  @IsString()
  @MinLength(8)
  password!: string;

  @ApiProperty({ example: 'Aida Sagadat' })
  @IsString()
  @MinLength(2)
  displayName!: string;

  @ApiProperty({ enum: ['TEACHER', 'STUDENT'] })
  @IsEnum(['TEACHER', 'STUDENT'])
  role!: 'TEACHER' | 'STUDENT';
}

export class LoginDto {
  @ApiProperty()
  @IsEmail()
  email!: string;

  @ApiProperty()
  @IsString()
  password!: string;
}

export class RefreshDto {
  @ApiProperty()
  @IsString()
  refreshToken!: string;
}

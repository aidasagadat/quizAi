import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsInt, IsOptional, IsString, MaxLength, Min, MinLength } from 'class-validator';

export class CreateTestDto {
  @ApiProperty()
  @IsString() @MinLength(1) @MaxLength(200)
  title!: string;

  @ApiProperty({ required: false })
  @IsOptional() @IsString() @MaxLength(2000)
  description?: string;

  @ApiProperty({ type: [String], required: false })
  @IsOptional() @IsArray()
  questionIds?: string[];
}

export class UpdateTestDto {
  @IsOptional() @IsString() title?: string;
  @IsOptional() @IsString() description?: string;
}

export class SetQuestionsDto {
  @ApiProperty({ type: [String] })
  @IsArray()
  questionIds!: string[];
}

export class AutoSelectQuestionsDto {
  @ApiProperty({ required: false, description: 'Filter by sourceId to keep questions relevant' })
  @IsOptional() @IsString()
  sourceId?: string;

  @ApiProperty({ required: false, description: 'Filter by topic hint' })
  @IsOptional() @IsString()
  topic?: string;

  @ApiProperty({ minimum: 0, default: 0 })
  @IsOptional() @IsInt() @Min(0)
  easyCount?: number;

  @ApiProperty({ minimum: 0, default: 0 })
  @IsOptional() @IsInt() @Min(0)
  mediumCount?: number;

  @ApiProperty({ minimum: 0, default: 0 })
  @IsOptional() @IsInt() @Min(0)
  hardCount?: number;
}

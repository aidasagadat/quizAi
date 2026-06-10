import { ApiProperty } from '@nestjs/swagger';
import { ArrayMinSize, IsArray, IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class GenerateQuestionsDto {
  @ApiProperty({ description: 'Source ID (PDF/DOCX/text already uploaded) OR pass rawText below' })
  @IsOptional() @IsString()
  sourceId?: string;

  @ApiProperty({ required: false, description: 'Alternative to sourceId: paste raw text inline' })
  @IsOptional() @IsString()
  rawText?: string;

  @ApiProperty({ enum: ['MULTIPLE_CHOICE','TRUE_FALSE','SHORT_ANSWER','FILL_BLANK'] })
  @IsEnum(['MULTIPLE_CHOICE','TRUE_FALSE','SHORT_ANSWER','FILL_BLANK'])
  type!: 'MULTIPLE_CHOICE'|'TRUE_FALSE'|'SHORT_ANSWER'|'FILL_BLANK';

  @ApiProperty({ minimum: 1, maximum: 50, example: 5 })
  @IsInt() @Min(1) @Max(50)
  count!: number;

  @ApiProperty({ isArray: true, enum: ['REMEMBER','UNDERSTAND','APPLY','ANALYZE','EVALUATE','CREATE'] })
  @IsArray() @ArrayMinSize(1)
  @IsEnum(['REMEMBER','UNDERSTAND','APPLY','ANALYZE','EVALUATE','CREATE'], { each: true })
  bloomLevels!: ('REMEMBER'|'UNDERSTAND'|'APPLY'|'ANALYZE'|'EVALUATE'|'CREATE')[];

  @ApiProperty({ required: false })
  @IsOptional() @IsString()
  topicHint?: string;

  @ApiProperty({ enum: ['EASY','MEDIUM','HARD'], required: false })
  @IsOptional() @IsEnum(['EASY','MEDIUM','HARD'])
  difficulty?: 'EASY'|'MEDIUM'|'HARD';
}

export class UpdateQuestionDto {
  @IsOptional() @IsString() stem?: string;
  @IsOptional() payload?: any;
  @IsOptional() @IsString() explanation?: string;
  @IsOptional() @IsString() topic?: string;
  @IsOptional() @IsEnum(['REMEMBER','UNDERSTAND','APPLY','ANALYZE','EVALUATE','CREATE'])
  bloomLevel?: 'REMEMBER'|'UNDERSTAND'|'APPLY'|'ANALYZE'|'EVALUATE'|'CREATE';
  @IsOptional() @IsEnum(['DRAFT','ACCEPTED','DISCARDED']) status?: 'DRAFT'|'ACCEPTED'|'DISCARDED';
  @IsOptional() @IsEnum(['EASY','MEDIUM','HARD']) difficulty?: 'EASY'|'MEDIUM'|'HARD';
}

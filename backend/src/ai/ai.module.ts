import {
  Body,
  Controller,
  Get,
  Module,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiProperty, ApiTags } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, AuthUser } from '../common/current-user.decorator';
import { AiService } from './ai.service';

class ChatDto {
  @ApiProperty({ description: 'Conversation thread id (any stable string).' })
  @IsString()
  threadId!: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(4000)
  content!: string;
}

@ApiTags('ai')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('ai')
export class AiController {
  constructor(private readonly ai: AiService) {}

  @Post('chat')
  chat(@CurrentUser() user: AuthUser, @Body() dto: ChatDto) {
    return this.ai.chat(user, dto.threadId, dto.content);
  }

  @Get('threads/:threadId')
  thread(@CurrentUser() user: AuthUser, @Param('threadId') threadId: string) {
    return this.ai.listThread(user, threadId);
  }
}

@Module({
  controllers: [AiController],
  providers: [AiService],
  exports: [AiService],
})
export class AiModule {}

import {
  Body,
  Controller,
  Delete,
  Get,
  Injectable,
  Module,
  NotFoundException,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiProperty, ApiTags } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { Mood } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, AuthUser } from '../common/current-user.decorator';
import { ChildAccess } from '../common/child-access';
import { PrismaService } from '../prisma/prisma.service';

export class CreateMoodDto {
  @ApiProperty()
  @IsString()
  childId!: string;

  @ApiProperty({ enum: Mood })
  @IsEnum(Mood)
  mood!: Mood;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  loggedAt?: string;

  @ApiProperty({ required: false, description: 'Attached voice note (POST /voice-notes)' })
  @IsOptional()
  @IsString()
  voiceNoteId?: string;
}

@Injectable()
export class MoodsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: ChildAccess,
  ) {}

  async create(user: AuthUser, dto: CreateMoodDto) {
    await this.access.assertCaregiver(user.id, user.role, dto.childId);
    return this.prisma.moodEntry.create({
      data: {
        childId: dto.childId,
        mood: dto.mood,
        note: dto.note,
        voiceNoteId: dto.voiceNoteId,
        loggedAt: dto.loggedAt ? new Date(dto.loggedAt) : new Date(),
      },
    });
  }

  async list(user: AuthUser, childId: string, take = 50) {
    await this.access.assertCaregiver(user.id, user.role, childId);
    return this.prisma.moodEntry.findMany({
      where: { childId },
      orderBy: { loggedAt: 'desc' },
      take,
    });
  }

  async remove(user: AuthUser, id: string) {
    const entry = await this.prisma.moodEntry.findUnique({ where: { id } });
    if (!entry) throw new NotFoundException('Mood entry not found');
    await this.access.assertCaregiver(user.id, user.role, entry.childId);
    await this.prisma.moodEntry.delete({ where: { id } });
    return { ok: true };
  }
}

@ApiTags('moods')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('moods')
export class MoodsController {
  constructor(private readonly svc: MoodsService) {}

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateMoodDto) {
    return this.svc.create(user, dto);
  }

  @Get()
  list(@CurrentUser() user: AuthUser, @Query('childId') childId: string) {
    return this.svc.list(user, childId);
  }

  @Delete(':id')
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.svc.remove(user, id);
  }
}

@Module({
  controllers: [MoodsController],
  providers: [MoodsService, ChildAccess],
})
export class MoodsModule {}

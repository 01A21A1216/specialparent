import {
  Body,
  Controller,
  Delete,
  Get,
  Injectable,
  Module,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiProperty, ApiTags } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { GoalStatus } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, AuthUser } from '../common/current-user.decorator';
import { ChildAccess } from '../common/child-access';
import { PrismaService } from '../prisma/prisma.service';

export class CreateGoalDto {
  @ApiProperty() @IsString() childId!: string;
  @ApiProperty() @IsString() @MaxLength(200) title!: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() description?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsDateString() targetDate?: string;
}

export class UpdateGoalDto {
  @IsOptional() @IsString() @MaxLength(200) title?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsEnum(GoalStatus) status?: GoalStatus;
  @IsOptional() @IsInt() @Min(0) @Max(100) progress?: number;
  @IsOptional() @IsDateString() targetDate?: string;
}

@Injectable()
export class GoalsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: ChildAccess,
  ) {}

  async create(user: AuthUser, dto: CreateGoalDto) {
    await this.access.assertCaregiver(user.id, user.role, dto.childId);
    return this.prisma.goal.create({
      data: {
        childId: dto.childId,
        title: dto.title,
        description: dto.description,
        targetDate: dto.targetDate ? new Date(dto.targetDate) : undefined,
      },
    });
  }

  async list(user: AuthUser, childId: string) {
    await this.access.assertCaregiver(user.id, user.role, childId);
    return this.prisma.goal.findMany({
      where: { childId },
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
    });
  }

  async update(user: AuthUser, id: string, dto: UpdateGoalDto) {
    const g = await this.prisma.goal.findUnique({ where: { id } });
    if (!g) throw new NotFoundException('Goal not found');
    await this.access.assertCaregiver(user.id, user.role, g.childId);
    return this.prisma.goal.update({
      where: { id },
      data: {
        ...dto,
        targetDate: dto.targetDate ? new Date(dto.targetDate) : undefined,
      },
    });
  }

  async remove(user: AuthUser, id: string) {
    const g = await this.prisma.goal.findUnique({ where: { id } });
    if (!g) return { ok: true };
    await this.access.assertCaregiver(user.id, user.role, g.childId);
    await this.prisma.goal.delete({ where: { id } });
    return { ok: true };
  }
}

@ApiTags('goals')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('goals')
export class GoalsController {
  constructor(private readonly svc: GoalsService) {}

  @Post() create(@CurrentUser() u: AuthUser, @Body() dto: CreateGoalDto) {
    return this.svc.create(u, dto);
  }
  @Get() list(@CurrentUser() u: AuthUser, @Query('childId') childId: string) {
    return this.svc.list(u, childId);
  }
  @Patch(':id')
  update(@CurrentUser() u: AuthUser, @Param('id') id: string, @Body() dto: UpdateGoalDto) {
    return this.svc.update(u, id, dto);
  }
  @Delete(':id')
  remove(@CurrentUser() u: AuthUser, @Param('id') id: string) {
    return this.svc.remove(u, id);
  }
}

@Module({
  controllers: [GoalsController],
  providers: [GoalsService, ChildAccess],
})
export class GoalsModule {}

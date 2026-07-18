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
import { BehaviorEventKind } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, AuthUser } from '../common/current-user.decorator';
import { ChildAccess } from '../common/child-access';
import { PrismaService } from '../prisma/prisma.service';

export class CreateBehaviorDto {
  @ApiProperty({ enum: BehaviorEventKind })
  @IsEnum(BehaviorEventKind)
  kind!: BehaviorEventKind;

  @ApiProperty({ example: '2026-07-18T14:00:00Z' })
  @IsDateString()
  occurredAt!: string;

  @ApiProperty({ required: false, minimum: 1, maximum: 1440 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(1440)
  durationMins?: number;

  @ApiProperty({ required: false, minimum: 1, maximum: 5 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  severity?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  trigger?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  helped?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  note?: string;
}

export class UpdateBehaviorDto {
  @IsOptional() @IsEnum(BehaviorEventKind) kind?: BehaviorEventKind;
  @IsOptional() @IsDateString() occurredAt?: string;
  @IsOptional() @IsInt() @Min(1) @Max(1440) durationMins?: number;
  @IsOptional() @IsInt() @Min(1) @Max(5) severity?: number;
  @IsOptional() @IsString() @MaxLength(500) trigger?: string;
  @IsOptional() @IsString() @MaxLength(500) helped?: string;
  @IsOptional() @IsString() @MaxLength(2000) note?: string;
}

@Injectable()
export class BehaviorService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: ChildAccess,
  ) {}

  async create(user: AuthUser, childId: string, dto: CreateBehaviorDto) {
    await this.access.assertCaregiver(user.id, user.role, childId);
    return this.prisma.behaviorEvent.create({
      data: {
        childId,
        loggedById: user.id,
        kind: dto.kind,
        occurredAt: new Date(dto.occurredAt),
        durationMins: dto.durationMins,
        severity: dto.severity,
        trigger: dto.trigger,
        helped: dto.helped,
        note: dto.note,
      },
      include: { loggedBy: { select: { id: true, fullName: true } } },
    });
  }

  async list(
    user: AuthUser,
    childId: string,
    kind?: BehaviorEventKind,
    limit = 100,
  ) {
    await this.access.assertCaregiver(user.id, user.role, childId);
    return this.prisma.behaviorEvent.findMany({
      where: {
        childId,
        ...(kind ? { kind } : {}),
      },
      orderBy: { occurredAt: 'desc' },
      take: Math.min(Math.max(limit, 1), 500),
      include: { loggedBy: { select: { id: true, fullName: true } } },
    });
  }

  async update(user: AuthUser, id: string, dto: UpdateBehaviorDto) {
    const evt = await this.prisma.behaviorEvent.findUnique({ where: { id } });
    if (!evt) throw new NotFoundException('Behavior event not found');
    await this.access.assertCaregiver(user.id, user.role, evt.childId);
    return this.prisma.behaviorEvent.update({
      where: { id },
      data: {
        ...dto,
        occurredAt: dto.occurredAt ? new Date(dto.occurredAt) : undefined,
      },
    });
  }

  async remove(user: AuthUser, id: string) {
    const evt = await this.prisma.behaviorEvent.findUnique({ where: { id } });
    if (!evt) return { ok: true };
    await this.access.assertCaregiver(user.id, user.role, evt.childId);
    await this.prisma.behaviorEvent.delete({ where: { id } });
    return { ok: true };
  }
}

@ApiTags('behavior')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class BehaviorController {
  constructor(private readonly svc: BehaviorService) {}

  @Post('children/:childId/behavior')
  create(
    @CurrentUser() user: AuthUser,
    @Param('childId') childId: string,
    @Body() dto: CreateBehaviorDto,
  ) {
    return this.svc.create(user, childId, dto);
  }

  @Get('children/:childId/behavior')
  list(
    @CurrentUser() user: AuthUser,
    @Param('childId') childId: string,
    @Query('kind') kind?: BehaviorEventKind,
    @Query('limit') limit?: string,
  ) {
    return this.svc.list(
      user,
      childId,
      kind,
      limit ? parseInt(limit, 10) : undefined,
    );
  }

  @Patch('behavior/:id')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateBehaviorDto,
  ) {
    return this.svc.update(user, id, dto);
  }

  @Delete('behavior/:id')
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.svc.remove(user, id);
  }
}

@Module({
  controllers: [BehaviorController],
  providers: [BehaviorService, ChildAccess],
})
export class BehaviorModule {}

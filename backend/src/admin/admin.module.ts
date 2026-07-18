import {
  BadRequestException,
  Body,
  CanActivate,
  Controller,
  Delete,
  ExecutionContext,
  ForbiddenException,
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
  IsArray,
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
} from 'class-validator';
import { Language, Role } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, AuthUser } from '../common/current-user.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { RedisCacheService } from '../common/cache/cache.module';

// ─── Admin guard ───────────────────────────────────────────
@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(ctx: ExecutionContext): boolean {
    const req = ctx.switchToHttp().getRequest();
    const user = req.user as AuthUser | undefined;
    if (!user || user.role !== 'ADMIN') {
      throw new ForbiddenException('Admin access required');
    }
    return true;
  }
}

// ─── DTOs ───────────────────────────────────────────────────
export class UpdateUserDto {
  @ApiProperty({ enum: Role, required: false })
  @IsOptional()
  @IsEnum(Role)
  role?: Role;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpsertResourceDto {
  @ApiProperty() @IsString() @MaxLength(200) slug!: string;
  @ApiProperty() @IsString() @MaxLength(200) title!: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() @MaxLength(500) excerpt?: string;
  @ApiProperty() @IsString() body!: string;
  @ApiProperty() @IsString() @MaxLength(50) category!: string;
  @ApiProperty({ enum: Language, required: false }) @IsOptional() @IsEnum(Language) language?: Language;
  @ApiProperty({ required: false }) @IsOptional() @IsString() coverImage?: string;
  @ApiProperty({ required: false, description: 'set true to publish, false to unpublish' })
  @IsOptional()
  @IsBoolean()
  publish?: boolean;
}

export class UpsertSchemeDto {
  @ApiProperty() @IsString() @MaxLength(200) slug!: string;
  @ApiProperty() @IsString() @MaxLength(200) name!: string;
  @ApiProperty() @IsString() description!: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() benefitSummary?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() eligibility?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() @IsUrl() applyUrl?: string;
  @ApiProperty({ required: false, type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  states?: string[];
  @ApiProperty({ enum: Language, required: false }) @IsOptional() @IsEnum(Language) language?: Language;
}

// ─── Service ────────────────────────────────────────────────
@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: RedisCacheService,
  ) {}

  private async invalidateResources(slug?: string) {
    await this.cache.delPattern('resources:list:*');
    if (slug) await this.cache.del(`resources:detail:${slug}`);
  }

  private async invalidateSchemes() {
    await this.cache.delPattern('schemes:list:*');
  }

  async overview() {
    const [
      totalUsers,
      usersByRole,
      activeUsers,
      totalChildren,
      totalSessions,
      sessionsThisMonth,
      totalPosts,
      totalComments,
      publishedResources,
      totalSchemes,
      recentSignups,
      moodDistribution,
      sessionsByType,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.groupBy({ by: ['role'], _count: { _all: true } }),
      this.prisma.user.count({ where: { isActive: true } }),
      this.prisma.child.count(),
      this.prisma.therapySession.count(),
      this.prisma.therapySession.count({
        where: { scheduledAt: { gte: new Date(Date.now() - 30 * 24 * 3600 * 1000) } },
      }),
      this.prisma.communityPost.count(),
      this.prisma.communityComment.count(),
      this.prisma.resource.count({ where: { publishedAt: { not: null } } }),
      this.prisma.governmentScheme.count(),
      this.prisma.user.findMany({
        orderBy: { createdAt: 'desc' },
        take: 8,
        select: {
          id: true, fullName: true, email: true, role: true,
          isActive: true, createdAt: true,
        },
      }),
      this.prisma.moodEntry.groupBy({ by: ['mood'], _count: { _all: true } }),
      this.prisma.therapySession.groupBy({ by: ['type'], _count: { _all: true } }),
    ]);

    // 30-day signup trend (per day)
    const signupRows = await this.prisma.$queryRaw<Array<{ day: string; n: bigint }>>`
      SELECT to_char(date_trunc('day', "createdAt"), 'YYYY-MM-DD') as day,
             count(*) as n
      FROM "User"
      WHERE "createdAt" >= now() - interval '30 days'
      GROUP BY 1
      ORDER BY 1
    `;
    const signupTrend = signupRows.map((r) => ({ day: r.day, count: Number(r.n) }));

    return {
      totals: {
        users: totalUsers,
        activeUsers,
        children: totalChildren,
        sessions: totalSessions,
        sessionsThisMonth,
        posts: totalPosts,
        comments: totalComments,
        publishedResources,
        schemes: totalSchemes,
      },
      usersByRole: usersByRole.map((r) => ({ role: r.role, count: r._count._all })),
      moodDistribution: moodDistribution.map((m) => ({ mood: m.mood, count: m._count._all })),
      sessionsByType: sessionsByType.map((s) => ({ type: s.type, count: s._count._all })),
      recentSignups,
      signupTrend,
    };
  }

  // ─── Users ────────────────────────────────────────────────
  listUsers(role?: Role, q?: string, limit = 100) {
    return this.prisma.user.findMany({
      where: {
        ...(role ? { role } : {}),
        ...(q
          ? {
              OR: [
                { fullName: { contains: q, mode: 'insensitive' as const } },
                { email: { contains: q, mode: 'insensitive' as const } },
              ],
            }
          : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: Math.min(Math.max(limit, 1), 200),
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        isActive: true,
        emailVerifiedAt: true,
        lastLoginAt: true,
        createdAt: true,
      },
    });
  }

  async updateUser(actor: AuthUser, id: string, dto: UpdateUserDto) {
    if (id === actor.id && dto.isActive === false) {
      throw new BadRequestException("You can't deactivate your own admin account.");
    }
    if (id === actor.id && dto.role && dto.role !== 'ADMIN') {
      throw new BadRequestException("You can't demote your own admin account.");
    }
    const exists = await this.prisma.user.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException('User not found');
    return this.prisma.user.update({
      where: { id },
      data: {
        ...(dto.role !== undefined ? { role: dto.role } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        isActive: true,
        emailVerifiedAt: true,
        lastLoginAt: true,
        createdAt: true,
      },
    });
  }

  // ─── Community moderation ────────────────────────────────
  listPosts(limit = 100) {
    return this.prisma.communityPost.findMany({
      orderBy: { createdAt: 'desc' },
      take: Math.min(Math.max(limit, 1), 200),
      include: {
        author: { select: { id: true, fullName: true, email: true } },
        _count: { select: { comments: true } },
      },
    });
  }

  async deletePost(id: string) {
    const post = await this.prisma.communityPost.findUnique({ where: { id } });
    if (!post) return { ok: true };
    await this.prisma.communityPost.delete({ where: { id } });
    return { ok: true };
  }

  // ─── Resources CMS ───────────────────────────────────────
  listResources() {
    return this.prisma.resource.findMany({
      orderBy: { updatedAt: 'desc' },
    });
  }

  async upsertResource(dto: UpsertResourceDto) {
    const data = {
      title: dto.title,
      excerpt: dto.excerpt,
      body: dto.body,
      category: dto.category,
      language: dto.language ?? 'EN',
      coverImage: dto.coverImage,
      publishedAt:
        dto.publish === true ? new Date()
          : dto.publish === false ? null
          : undefined,
    };
    const r = await this.prisma.resource.upsert({
      where: { slug: dto.slug },
      update: data,
      create: { slug: dto.slug, ...data },
    });
    await this.invalidateResources(r.slug);
    return r;
  }

  async deleteResource(id: string) {
    const r = await this.prisma.resource.findUnique({ where: { id } });
    if (!r) return { ok: true };
    await this.prisma.resource.delete({ where: { id } });
    await this.invalidateResources(r.slug);
    return { ok: true };
  }

  // ─── Schemes CMS ─────────────────────────────────────────
  listSchemes() {
    return this.prisma.governmentScheme.findMany({ orderBy: { name: 'asc' } });
  }

  async upsertScheme(dto: UpsertSchemeDto) {
    const data = {
      name: dto.name,
      description: dto.description,
      benefitSummary: dto.benefitSummary,
      eligibility: dto.eligibility,
      applyUrl: dto.applyUrl,
      states: dto.states ?? [],
      language: dto.language ?? 'EN',
    };
    const s = await this.prisma.governmentScheme.upsert({
      where: { slug: dto.slug },
      update: data,
      create: { slug: dto.slug, ...data },
    });
    await this.invalidateSchemes();
    return s;
  }

  async deleteScheme(id: string) {
    const s = await this.prisma.governmentScheme.findUnique({ where: { id } });
    if (!s) return { ok: true };
    await this.prisma.governmentScheme.delete({ where: { id } });
    await this.invalidateSchemes();
    return { ok: true };
  }

  // ─── Audit log feed ──────────────────────────────────────
  recentAudit(limit = 50) {
    return this.prisma.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: Math.min(Math.max(limit, 1), 200),
      include: {
        user: { select: { id: true, fullName: true, role: true } },
      },
    });
  }
}

// ─── Controller ─────────────────────────────────────────────
@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, AdminGuard)
@Controller('admin')
export class AdminController {
  constructor(private readonly svc: AdminService) {}

  @Get('overview')
  overview() {
    return this.svc.overview();
  }

  @Get('users')
  listUsers(
    @Query('role') role?: Role,
    @Query('q') q?: string,
    @Query('limit') limit?: string,
  ) {
    return this.svc.listUsers(role, q, limit ? Number(limit) : undefined);
  }

  @Patch('users/:id')
  updateUser(
    @CurrentUser() actor: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
  ) {
    return this.svc.updateUser(actor, id, dto);
  }

  @Get('community/posts')
  listPosts(@Query('limit') limit?: string) {
    return this.svc.listPosts(limit ? Number(limit) : undefined);
  }

  @Delete('community/posts/:id')
  deletePost(@Param('id') id: string) {
    return this.svc.deletePost(id);
  }

  @Get('resources')
  listResources() {
    return this.svc.listResources();
  }

  @Post('resources')
  upsertResource(@Body() dto: UpsertResourceDto) {
    return this.svc.upsertResource(dto);
  }

  @Delete('resources/:id')
  deleteResource(@Param('id') id: string) {
    return this.svc.deleteResource(id);
  }

  @Get('schemes')
  listSchemes() {
    return this.svc.listSchemes();
  }

  @Post('schemes')
  upsertScheme(@Body() dto: UpsertSchemeDto) {
    return this.svc.upsertScheme(dto);
  }

  @Delete('schemes/:id')
  deleteScheme(@Param('id') id: string) {
    return this.svc.deleteScheme(id);
  }

  @Get('audit')
  recentAudit(@Query('limit') limit?: string) {
    return this.svc.recentAudit(limit ? Number(limit) : undefined);
  }
}

@Module({
  controllers: [AdminController],
  providers: [AdminService, AdminGuard],
})
export class AdminModule {}

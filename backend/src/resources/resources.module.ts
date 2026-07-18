import {
  Controller,
  Get,
  Injectable,
  Module,
  NotFoundException,
  Param,
  Query,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Language, Resource, GovernmentScheme } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { RedisCacheService } from '../common/cache/cache.module';

// Public CMS-lite endpoints. Read-heavy, low churn. Cached with short TTL;
// admin writes explicitly invalidate the matching keys (see admin.module.ts).
const LIST_TTL_SEC = 60;
const DETAIL_TTL_SEC = 300;

function listKey(prefix: string, ...parts: Array<string | undefined>) {
  return `${prefix}:list:${parts.map((p) => p ?? '*').join(':')}`;
}

@Injectable()
export class ResourcesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: RedisCacheService,
  ) {}

  async listResources(category?: string, language?: Language) {
    const key = listKey('resources', category, language);
    const cached = await this.cache.get<Resource[]>(key);
    if (cached) return cached;
    const rows = await this.prisma.resource.findMany({
      where: {
        ...(category ? { category } : {}),
        ...(language ? { language } : {}),
        publishedAt: { not: null },
      },
      orderBy: { publishedAt: 'desc' },
      take: 100,
    });
    await this.cache.set(key, rows, LIST_TTL_SEC);
    return rows;
  }

  async getResource(slug: string) {
    const key = `resources:detail:${slug}`;
    const cached = await this.cache.get<Resource>(key);
    if (cached) return cached;
    const r = await this.prisma.resource.findUnique({ where: { slug } });
    if (!r || !r.publishedAt) throw new NotFoundException('Resource not found');
    await this.cache.set(key, r, DETAIL_TTL_SEC);
    return r;
  }

  async listSchemes(state?: string, language?: Language) {
    const key = listKey('schemes', state, language);
    const cached = await this.cache.get<GovernmentScheme[]>(key);
    if (cached) return cached;
    const rows = await this.prisma.governmentScheme.findMany({
      where: {
        ...(state ? { states: { has: state } } : {}),
        ...(language ? { language } : {}),
      },
      orderBy: { name: 'asc' },
    });
    await this.cache.set(key, rows, LIST_TTL_SEC);
    return rows;
  }
}

@ApiTags('public')
@Controller('public')
export class ResourcesController {
  constructor(private readonly svc: ResourcesService) {}

  @Get('resources')
  listResources(
    @Query('category') category?: string,
    @Query('language') language?: Language,
  ) {
    return this.svc.listResources(category, language);
  }

  @Get('resources/:slug')
  getResource(@Param('slug') slug: string) {
    return this.svc.getResource(slug);
  }

  @Get('schemes')
  listSchemes(
    @Query('state') state?: string,
    @Query('language') language?: Language,
  ) {
    return this.svc.listSchemes(state, language);
  }
}

@Module({
  controllers: [ResourcesController],
  providers: [ResourcesService],
})
export class ResourcesModule {}

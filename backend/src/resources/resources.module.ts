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
import { Language } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ResourcesService {
  constructor(private readonly prisma: PrismaService) {}

  listResources(category?: string, language?: Language) {
    return this.prisma.resource.findMany({
      where: {
        ...(category ? { category } : {}),
        ...(language ? { language } : {}),
        publishedAt: { not: null },
      },
      orderBy: { publishedAt: 'desc' },
      take: 100,
    });
  }

  async getResource(slug: string) {
    const r = await this.prisma.resource.findUnique({ where: { slug } });
    if (!r || !r.publishedAt) throw new NotFoundException('Resource not found');
    return r;
  }

  listSchemes(state?: string, language?: Language) {
    return this.prisma.governmentScheme.findMany({
      where: {
        ...(state ? { states: { has: state } } : {}),
        ...(language ? { language } : {}),
      },
      orderBy: { name: 'asc' },
    });
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

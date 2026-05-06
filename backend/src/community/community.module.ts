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
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { PostCategory } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, AuthUser } from '../common/current-user.decorator';
import { PrismaService } from '../prisma/prisma.service';

export class CreatePostDto {
  @ApiProperty() @IsString() @MinLength(3) @MaxLength(200) title!: string;
  @ApiProperty() @IsString() @MinLength(10) @MaxLength(10000) body!: string;
  @ApiProperty({ enum: PostCategory, required: false }) @IsOptional() @IsEnum(PostCategory) category?: PostCategory;
  @ApiProperty({ required: false, type: [String] })
  @IsOptional() @IsArray() @IsString({ each: true }) tags?: string[];
}

export class CreateCommentDto {
  @ApiProperty() @IsString() @MinLength(1) @MaxLength(2000) body!: string;
}

@Injectable()
export class CommunityService {
  constructor(private readonly prisma: PrismaService) {}

  async createPost(user: AuthUser, dto: CreatePostDto) {
    return this.prisma.communityPost.create({
      data: {
        authorId: user.id,
        title: dto.title,
        body: dto.body,
        category: dto.category ?? 'GENERAL',
        tags: dto.tags ?? [],
      },
      include: { author: { select: { id: true, fullName: true, role: true } } },
    });
  }

  async listPosts(category?: PostCategory) {
    return this.prisma.communityPost.findMany({
      where: category ? { category } : undefined,
      orderBy: [{ pinned: 'desc' }, { createdAt: 'desc' }],
      take: 50,
      include: {
        author: { select: { id: true, fullName: true, role: true } },
        _count: { select: { comments: true } },
      },
    });
  }

  async getPost(id: string) {
    const post = await this.prisma.communityPost.findUnique({
      where: { id },
      include: {
        author: { select: { id: true, fullName: true, role: true } },
        comments: {
          orderBy: { createdAt: 'asc' },
          include: { author: { select: { id: true, fullName: true, role: true } } },
        },
      },
    });
    if (!post) throw new NotFoundException('Post not found');
    return post;
  }

  async addComment(user: AuthUser, postId: string, dto: CreateCommentDto) {
    return this.prisma.communityComment.create({
      data: { postId, authorId: user.id, body: dto.body },
      include: { author: { select: { id: true, fullName: true, role: true } } },
    });
  }

  async deletePost(user: AuthUser, id: string) {
    const post = await this.prisma.communityPost.findUnique({ where: { id } });
    if (!post) return { ok: true };
    if (post.authorId !== user.id && user.role !== 'ADMIN') {
      throw new NotFoundException('Post not found');
    }
    await this.prisma.communityPost.delete({ where: { id } });
    return { ok: true };
  }
}

@ApiTags('community')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('community')
export class CommunityController {
  constructor(private readonly svc: CommunityService) {}

  @Post('posts')
  create(@CurrentUser() u: AuthUser, @Body() dto: CreatePostDto) {
    return this.svc.createPost(u, dto);
  }
  @Get('posts')
  list(@Query('category') category?: PostCategory) {
    return this.svc.listPosts(category);
  }
  @Get('posts/:id') get(@Param('id') id: string) {
    return this.svc.getPost(id);
  }
  @Post('posts/:id/comments')
  addComment(
    @CurrentUser() u: AuthUser,
    @Param('id') id: string,
    @Body() dto: CreateCommentDto,
  ) {
    return this.svc.addComment(u, id, dto);
  }
  @Delete('posts/:id')
  remove(@CurrentUser() u: AuthUser, @Param('id') id: string) {
    return this.svc.deletePost(u, id);
  }
}

@Module({
  controllers: [CommunityController],
  providers: [CommunityService],
})
export class CommunityModule {}

import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Injectable,
  Module,
  NotFoundException,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiProperty, ApiTags } from '@nestjs/swagger';
import { IsString } from 'class-validator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, AuthUser } from '../common/current-user.decorator';
import { ChildAccess } from '../common/child-access';
import { PrismaService } from '../prisma/prisma.service';

// A sibling link is a shared SiblingGroup between two Child rows. The user
// must be a caregiver of BOTH children before we let them link — otherwise
// two unrelated parents could stitch their kids together by guessing IDs.

export class LinkSiblingDto {
  @ApiProperty({ description: 'Id of the OTHER child to link as a sibling.' })
  @IsString()
  otherChildId!: string;
}

@Injectable()
export class SiblingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: ChildAccess,
  ) {}

  /**
   * Returns the other children in this child's sibling group. Empty when the
   * child has no group. Result excludes the current child.
   */
  async list(user: AuthUser, childId: string) {
    await this.access.assertCaregiver(user.id, user.role, childId);
    const child = await this.prisma.child.findUnique({
      where: { id: childId },
      select: { siblingGroupId: true },
    });
    if (!child?.siblingGroupId) return [];
    return this.prisma.child.findMany({
      where: { siblingGroupId: child.siblingGroupId, id: { not: childId } },
      select: {
        id: true,
        fullName: true,
        dateOfBirth: true,
        photoUrl: true,
        diagnoses: true,
      },
      orderBy: { dateOfBirth: 'asc' },
    });
  }

  async link(user: AuthUser, childId: string, dto: LinkSiblingDto) {
    if (childId === dto.otherChildId) {
      throw new BadRequestException("A child can't be their own sibling.");
    }
    // Require caregiver rights on BOTH — otherwise linking is a privilege
    // escalation across families.
    await this.access.assertCaregiver(user.id, user.role, childId);
    try {
      await this.access.assertCaregiver(user.id, user.role, dto.otherChildId);
    } catch {
      throw new ForbiddenException(
        'You must be a caregiver of both children to link them as siblings.',
      );
    }

    const [a, b] = await Promise.all([
      this.prisma.child.findUnique({
        where: { id: childId },
        select: { id: true, siblingGroupId: true },
      }),
      this.prisma.child.findUnique({
        where: { id: dto.otherChildId },
        select: { id: true, siblingGroupId: true },
      }),
    ]);
    if (!a || !b) throw new NotFoundException('Child not found');

    // Merge / assign group. Four cases:
    //   neither: create a new group and put both in.
    //   only a:  put b in a's group.
    //   only b:  put a in b's group.
    //   both:    if same group → no-op; if different → merge b's group into a's.
    let groupId: string;
    if (!a.siblingGroupId && !b.siblingGroupId) {
      const grp = await this.prisma.siblingGroup.create({ data: {} });
      groupId = grp.id;
      await this.prisma.child.updateMany({
        where: { id: { in: [a.id, b.id] } },
        data: { siblingGroupId: groupId },
      });
    } else if (a.siblingGroupId && !b.siblingGroupId) {
      groupId = a.siblingGroupId;
      await this.prisma.child.update({ where: { id: b.id }, data: { siblingGroupId: groupId } });
    } else if (!a.siblingGroupId && b.siblingGroupId) {
      groupId = b.siblingGroupId;
      await this.prisma.child.update({ where: { id: a.id }, data: { siblingGroupId: groupId } });
    } else if (a.siblingGroupId === b.siblingGroupId) {
      groupId = a.siblingGroupId!;
    } else {
      // Merge: rehome everyone in b's group into a's group.
      groupId = a.siblingGroupId!;
      await this.prisma.child.updateMany({
        where: { siblingGroupId: b.siblingGroupId! },
        data: { siblingGroupId: groupId },
      });
      await this.prisma.siblingGroup.delete({ where: { id: b.siblingGroupId! } });
    }

    return { ok: true, siblingGroupId: groupId };
  }

  async unlink(user: AuthUser, childId: string) {
    await this.access.assertCaregiver(user.id, user.role, childId);
    const child = await this.prisma.child.findUnique({
      where: { id: childId },
      select: { siblingGroupId: true },
    });
    if (!child?.siblingGroupId) return { ok: true };

    const groupId = child.siblingGroupId;
    await this.prisma.child.update({
      where: { id: childId },
      data: { siblingGroupId: null },
    });

    // Clean up: if the group now has <2 members it's meaningless — dissolve.
    const remaining = await this.prisma.child.count({
      where: { siblingGroupId: groupId },
    });
    if (remaining < 2) {
      await this.prisma.child.updateMany({
        where: { siblingGroupId: groupId },
        data: { siblingGroupId: null },
      });
      await this.prisma.siblingGroup.delete({ where: { id: groupId } });
    }
    return { ok: true };
  }
}

@ApiTags('siblings')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class SiblingsController {
  constructor(private readonly svc: SiblingsService) {}

  @Get('children/:childId/siblings')
  list(@CurrentUser() user: AuthUser, @Param('childId') childId: string) {
    return this.svc.list(user, childId);
  }

  @Post('children/:childId/siblings')
  link(
    @CurrentUser() user: AuthUser,
    @Param('childId') childId: string,
    @Body() dto: LinkSiblingDto,
  ) {
    return this.svc.link(user, childId, dto);
  }

  // Removes the CURRENT child from its group; other siblings stay linked to
  // each other. Group dissolved if fewer than 2 members remain.
  @Delete('children/:childId/siblings')
  unlink(@CurrentUser() user: AuthUser, @Param('childId') childId: string) {
    return this.svc.unlink(user, childId);
  }
}

@Module({
  controllers: [SiblingsController],
  providers: [SiblingsService, ChildAccess],
})
export class SiblingsModule {}

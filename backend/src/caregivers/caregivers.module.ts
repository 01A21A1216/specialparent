import {
  BadRequestException,
  Controller,
  Delete,
  ForbiddenException,
  Injectable,
  Module,
  NotFoundException,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, AuthUser } from '../common/current-user.decorator';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CaregiversService {
  constructor(private readonly prisma: PrismaService) {}

  async remove(user: AuthUser, caregiverId: string) {
    const cg = await this.prisma.caregiver.findUnique({
      where: { id: caregiverId },
    });
    if (!cg) throw new NotFoundException('Caregiver link not found');

    // Only ADMIN or the primary caregiver of the same child may remove others.
    if (user.role !== Role.ADMIN) {
      const requester = await this.prisma.caregiver.findUnique({
        where: { userId_childId: { userId: user.id, childId: cg.childId } },
      });
      if (!requester || !requester.isPrimary) {
        throw new ForbiddenException(
          'Only the primary caregiver can remove care-team members',
        );
      }
    }

    // Primary can't be removed via this endpoint — that would orphan the
    // child. Reassign primary first (future feature) or delete the child.
    if (cg.isPrimary) {
      throw new BadRequestException(
        'The primary caregiver cannot be removed. Delete the child profile instead if needed.',
      );
    }

    await this.prisma.caregiver.delete({ where: { id: caregiverId } });
    return { ok: true };
  }
}

@ApiTags('caregivers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('caregivers')
export class CaregiversController {
  constructor(private readonly svc: CaregiversService) {}

  @Delete(':id')
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.svc.remove(user, id);
  }
}

@Module({
  controllers: [CaregiversController],
  providers: [CaregiversService],
})
export class CaregiversModule {}

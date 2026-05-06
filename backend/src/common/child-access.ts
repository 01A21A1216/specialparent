import { ForbiddenException, Injectable } from '@nestjs/common';
import { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ChildAccess {
  constructor(private readonly prisma: PrismaService) {}

  async assertCaregiver(userId: string, role: Role, childId: string) {
    if (role === 'ADMIN') return;
    const link = await this.prisma.caregiver.findUnique({
      where: { userId_childId: { userId, childId } },
    });
    if (!link) {
      // therapists may have access via session; allow if they have any session for this child
      if (role === 'THERAPIST') {
        const hasSession = await this.prisma.therapySession.findFirst({
          where: { childId, therapistId: userId },
          select: { id: true },
        });
        if (hasSession) return;
      }
      throw new ForbiddenException('No access to this child');
    }
  }
}

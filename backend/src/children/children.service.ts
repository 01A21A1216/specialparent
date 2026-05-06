import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateChildDto, UpdateChildDto } from './children.dto';

@Injectable()
export class ChildrenService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateChildDto) {
    return this.prisma.child.create({
      data: {
        fullName: dto.fullName,
        dateOfBirth: new Date(dto.dateOfBirth),
        gender: dto.gender ?? 'PREFER_NOT_TO_SAY',
        diagnoses: dto.diagnoses ?? [],
        allergies: dto.allergies ?? [],
        medications: dto.medications ?? [],
        sensoryTriggers: dto.sensoryTriggers ?? [],
        communicationType: dto.communicationType,
        schoolName: dto.schoolName,
        emergencyContact: dto.emergencyContact,
        notes: dto.notes,
        caregivers: {
          create: {
            userId,
            relationship: dto.relationship ?? 'parent',
            isPrimary: true,
          },
        },
      },
      include: { caregivers: true },
    });
  }

  async findAllForUser(userId: string, role: Role) {
    if (role === 'ADMIN') {
      return this.prisma.child.findMany({
        orderBy: { createdAt: 'desc' },
        include: { caregivers: { include: { user: { select: { fullName: true, email: true } } } } },
      });
    }
    return this.prisma.child.findMany({
      where: { caregivers: { some: { userId } } },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { milestones: true, therapySessions: true, goals: true } },
      },
    });
  }

  async findOne(userId: string, role: Role, childId: string) {
    const child = await this.prisma.child.findUnique({
      where: { id: childId },
      include: {
        caregivers: { include: { user: { select: { id: true, fullName: true, email: true, role: true } } } },
        milestones: { orderBy: { updatedAt: 'desc' } },
        goals: { orderBy: { createdAt: 'desc' } },
        therapySessions: {
          orderBy: { scheduledAt: 'desc' },
          take: 20,
          include: { therapist: { select: { id: true, fullName: true } } },
        },
        moodEntries: { orderBy: { loggedAt: 'desc' }, take: 30 },
      },
    });
    if (!child) throw new NotFoundException('Child not found');
    this.assertAccess(child, userId, role);
    return child;
  }

  async update(userId: string, role: Role, childId: string, dto: UpdateChildDto) {
    const child = await this.prisma.child.findUnique({
      where: { id: childId },
      include: { caregivers: true },
    });
    if (!child) throw new NotFoundException('Child not found');
    this.assertAccess(child, userId, role);

    return this.prisma.child.update({
      where: { id: childId },
      data: {
        ...dto,
        dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : undefined,
      },
    });
  }

  async remove(userId: string, role: Role, childId: string) {
    const child = await this.prisma.child.findUnique({
      where: { id: childId },
      include: { caregivers: true },
    });
    if (!child) throw new NotFoundException('Child not found');
    this.assertAccess(child, userId, role, /*requirePrimary*/ true);
    await this.prisma.child.delete({ where: { id: childId } });
    return { ok: true };
  }

  // ── helpers ────────────────────────────────────────────
  private assertAccess(
    child: { caregivers: { userId: string; isPrimary: boolean }[] },
    userId: string,
    role: Role,
    requirePrimary = false,
  ) {
    if (role === 'ADMIN') return;
    const link = child.caregivers.find((c) => c.userId === userId);
    if (!link) throw new ForbiddenException('Not a caregiver of this child');
    if (requirePrimary && !link.isPrimary) {
      throw new ForbiddenException('Only the primary caregiver can perform this action');
    }
  }
}

import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
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
        calmingStrategies: dto.calmingStrategies ?? [],
        hobbies: dto.hobbies ?? [],
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
        diagnosticReports: { orderBy: { createdAt: 'desc' } },
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
      include: { caregivers: true, diagnosticReports: true },
    });
    if (!child) throw new NotFoundException('Child not found');
    this.assertAccess(child, userId, role, /*requirePrimary*/ true);

    // The Child cascade wipes DB rows (Caregiver, Milestone, TherapySession,
    // Appointment, Goal, MoodEntry, DiagnosticReport). It does NOT know about
    // the files those diagnostic reports point to on disk — clean those first
    // so we don't leave orphans in backend/uploads/reports/.
    const uploadsRoot = path.join(process.cwd(), 'uploads');
    const dirsToTry = new Set<string>();
    await Promise.all(
      child.diagnosticReports.map(async (r) => {
        const abs = path.join(uploadsRoot, r.filePath);
        dirsToTry.add(path.dirname(abs));
        await fs.promises.unlink(abs).catch(() => {});
      }),
    );
    // Best-effort: remove the child's per-child directory if now empty.
    for (const dir of dirsToTry) {
      await fs.promises.rmdir(dir).catch(() => {});
    }

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

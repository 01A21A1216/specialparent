import {
  Controller,
  Get,
  Injectable,
  Module,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, AuthUser } from '../common/current-user.decorator';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async dashboard(user: AuthUser) {
    const [children, upcomingSessions, upcomingAppts, unreadNotifications, recentMoods] =
      await Promise.all([
        this.prisma.child.findMany({
          where:
            user.role === 'ADMIN'
              ? undefined
              : { caregivers: { some: { userId: user.id } } },
          select: {
            id: true,
            fullName: true,
            dateOfBirth: true,
            diagnoses: true,
            photoUrl: true,
            _count: {
              select: { milestones: true, therapySessions: true, goals: true },
            },
          },
          take: 10,
        }),
        this.prisma.therapySession.findMany({
          where: {
            status: 'SCHEDULED',
            scheduledAt: { gte: new Date() },
            ...(user.role === 'THERAPIST'
              ? { therapistId: user.id }
              : { child: { caregivers: { some: { userId: user.id } } } }),
          },
          orderBy: { scheduledAt: 'asc' },
          take: 5,
          include: {
            child: { select: { id: true, fullName: true } },
            therapist: { select: { id: true, fullName: true } },
          },
        }),
        this.prisma.appointment.findMany({
          where: { userId: user.id, startsAt: { gte: new Date() } },
          orderBy: { startsAt: 'asc' },
          take: 5,
          include: { child: { select: { id: true, fullName: true } } },
        }),
        this.prisma.notification.count({
          where: { userId: user.id, readAt: null },
        }),
        this.prisma.moodEntry.findMany({
          where: {
            child:
              user.role === 'ADMIN'
                ? undefined
                : { caregivers: { some: { userId: user.id } } },
          },
          orderBy: { loggedAt: 'desc' },
          take: 14,
          include: { child: { select: { id: true, fullName: true } } },
        }),
      ]);

    return {
      children,
      upcomingSessions,
      upcomingAppts,
      unreadNotifications,
      recentMoods,
    };
  }
}

@ApiTags('users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly svc: UsersService) {}

  @Get('dashboard')
  dashboard(@CurrentUser() user: AuthUser) {
    return this.svc.dashboard(user);
  }
}

@Module({
  controllers: [UsersController],
  providers: [UsersService],
})
export class UsersModule {}

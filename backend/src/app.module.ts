import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';

import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ChildrenModule } from './children/children.module';
import { MilestonesModule } from './milestones/milestones.module';
import { MoodsModule } from './moods/moods.module';
import { TherapyModule } from './therapy/therapy.module';
import { AppointmentsModule } from './appointments/appointments.module';
import { GoalsModule } from './goals/goals.module';
import { CommunityModule } from './community/community.module';
import { AiModule } from './ai/ai.module';
import { NotificationsModule } from './notifications/notifications.module';
import { ResourcesModule } from './resources/resources.module';
import { AdminModule } from './admin/admin.module';
import { ReportsModule } from './reports/reports.module';
import { InvitesModule } from './invites/invites.module';
import { CaregiversModule } from './caregivers/caregivers.module';
import { BehaviorModule } from './behavior/behavior.module';
import { IepModule } from './iep/iep.module';
import { SchoolsModule } from './schools/schools.module';
import { SiblingsModule } from './siblings/siblings.module';
import { MessagesModule } from './messages/messages.module';
import { PrivacyModule } from './privacy/privacy.module';
import { DocumentsModule } from './documents/documents.module';
import { InsightsModule } from './insights/insights.module';
import { RoutineModule } from './routine/routine.module';
import { HealthController } from './common/health.controller';
import { AuditInterceptor } from './common/audit.interceptor';
import { CacheModule } from './common/cache/cache.module';
import { StorageModule } from './common/storage/storage.module';
import { MailModule } from './common/mail/mail.module';
import { LoggerModule } from './common/logger.module';
import { GlobalExceptionFilter } from './common/global-exception.filter';
import { validateEnv } from './common/env.validation';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
    LoggerModule,
    ThrottlerModule.forRoot([
      { name: 'default', ttl: 60_000, limit: 120 },
      { name: 'ai', ttl: 60_000, limit: 30 },
      // Auth endpoints — much tighter to slow credential-stuffing / signup abuse.
      { name: 'auth', ttl: 60_000, limit: 10 },
    ]),
    PrismaModule,
    CacheModule,
    StorageModule,
    MailModule,
    AuthModule,
    UsersModule,
    ChildrenModule,
    MilestonesModule,
    MoodsModule,
    TherapyModule,
    AppointmentsModule,
    GoalsModule,
    CommunityModule,
    AiModule,
    NotificationsModule,
    ResourcesModule,
    AdminModule,
    ReportsModule,
    InvitesModule,
    CaregiversModule,
    BehaviorModule,
    IepModule,
    SchoolsModule,
    SiblingsModule,
    MessagesModule,
    PrivacyModule,
    DocumentsModule,
    InsightsModule,
    RoutineModule,
  ],
  controllers: [HealthController],
  providers: [
    { provide: APP_FILTER, useClass: GlobalExceptionFilter },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_INTERCEPTOR, useClass: AuditInterceptor },
  ],
})
export class AppModule {}

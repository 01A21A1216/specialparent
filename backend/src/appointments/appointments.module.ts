import {
  Body,
  Controller,
  Delete,
  Get,
  Injectable,
  Module,
  NotFoundException,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiProperty, ApiTags } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { AppointmentKind } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, AuthUser } from '../common/current-user.decorator';
import { ChildAccess } from '../common/child-access';
import { PrismaService } from '../prisma/prisma.service';

export class CreateAppointmentDto {
  @ApiProperty({ enum: AppointmentKind, required: false })
  @IsOptional()
  @IsEnum(AppointmentKind)
  kind?: AppointmentKind;

  @ApiProperty()
  @IsString()
  @MaxLength(200)
  title!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  childId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiProperty()
  @IsDateString()
  startsAt!: string;

  @ApiProperty()
  @IsDateString()
  endsAt!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  reminderAt?: string;
}

export class UpdateAppointmentDto {
  @IsOptional() @IsEnum(AppointmentKind) kind?: AppointmentKind;
  @IsOptional() @IsString() @MaxLength(200) title?: string;
  @IsOptional() @IsString() location?: string;
  @IsOptional() @IsDateString() startsAt?: string;
  @IsOptional() @IsDateString() endsAt?: string;
  @IsOptional() @IsString() notes?: string;
  @IsOptional() @IsDateString() reminderAt?: string;
}

@Injectable()
export class AppointmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: ChildAccess,
  ) {}

  async create(user: AuthUser, dto: CreateAppointmentDto) {
    if (dto.childId) {
      await this.access.assertCaregiver(user.id, user.role, dto.childId);
    }
    return this.prisma.appointment.create({
      data: {
        userId: user.id,
        childId: dto.childId,
        kind: dto.kind ?? 'OTHER',
        title: dto.title,
        location: dto.location,
        startsAt: new Date(dto.startsAt),
        endsAt: new Date(dto.endsAt),
        notes: dto.notes,
        reminderAt: dto.reminderAt ? new Date(dto.reminderAt) : undefined,
      },
    });
  }

  async listMine(user: AuthUser) {
    return this.prisma.appointment.findMany({
      where: { userId: user.id },
      orderBy: { startsAt: 'asc' },
      include: { child: { select: { id: true, fullName: true } } },
    });
  }

  async update(user: AuthUser, id: string, dto: UpdateAppointmentDto) {
    const appt = await this.prisma.appointment.findUnique({ where: { id } });
    if (!appt) throw new NotFoundException('Appointment not found');
    if (appt.userId !== user.id && user.role !== 'ADMIN') {
      throw new NotFoundException('Appointment not found');
    }
    return this.prisma.appointment.update({
      where: { id },
      data: {
        ...dto,
        startsAt: dto.startsAt ? new Date(dto.startsAt) : undefined,
        endsAt: dto.endsAt ? new Date(dto.endsAt) : undefined,
        reminderAt: dto.reminderAt ? new Date(dto.reminderAt) : undefined,
      },
    });
  }

  async remove(user: AuthUser, id: string) {
    const appt = await this.prisma.appointment.findUnique({ where: { id } });
    if (!appt) return { ok: true };
    if (appt.userId !== user.id && user.role !== 'ADMIN') {
      throw new NotFoundException('Appointment not found');
    }
    await this.prisma.appointment.delete({ where: { id } });
    return { ok: true };
  }
}

@ApiTags('appointments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('appointments')
export class AppointmentsController {
  constructor(private readonly svc: AppointmentsService) {}

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateAppointmentDto) {
    return this.svc.create(user, dto);
  }

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.svc.listMine(user);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateAppointmentDto,
  ) {
    return this.svc.update(user, id, dto);
  }

  @Delete(':id')
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.svc.remove(user, id);
  }
}

@Module({
  controllers: [AppointmentsController],
  providers: [AppointmentsService, ChildAccess],
})
export class AppointmentsModule {}

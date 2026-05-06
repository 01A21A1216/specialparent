import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, AuthUser } from '../common/current-user.decorator';
import { ChildrenService } from './children.service';
import { CreateChildDto, UpdateChildDto } from './children.dto';

@ApiTags('children')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('children')
export class ChildrenController {
  constructor(private readonly children: ChildrenService) {}

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateChildDto) {
    return this.children.create(user.id, dto);
  }

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.children.findAllForUser(user.id, user.role);
  }

  @Get(':id')
  get(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.children.findOne(user.id, user.role, id);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateChildDto,
  ) {
    return this.children.update(user.id, user.role, id, dto);
  }

  @Delete(':id')
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.children.remove(user.id, user.role, id);
  }
}

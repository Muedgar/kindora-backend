import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { StaffsService } from './staffs.service';
import { CreateStaffDto } from './dto/create-staff.dto';
import { ApiOperation } from '@nestjs/swagger';
import { ResponseMessage } from 'src/common/decorators';
import { STAFF_CREATED, STAFFS_FETCHED } from './messages';
import { ListFilterDTO } from 'src/common/dtos';
import { JwtAuthGuard, PermissionGuard, SchoolContextGuard } from 'src/auth/guards';
import { GetSchoolContext, GetUser, RequirePermission } from 'src/auth/decorators';
import { SchoolContext } from 'src/auth/interfaces';
import { User } from 'src/users/entities';

@Controller('staffs')
@UseGuards(JwtAuthGuard)
export class StaffsController {
  constructor(private readonly staffsService: StaffsService) {}

  @Post('create')
  @ApiOperation({ summary: 'Create a staff member' })
  @ResponseMessage(STAFF_CREATED)
  @UseGuards(SchoolContextGuard, PermissionGuard)
  @RequirePermission('manage:users')
  async createUser(
    @Body() createStaffDTO: CreateStaffDto,
    @GetUser() requestingUser: User,
    @GetSchoolContext() ctx: SchoolContext,
  ) {
    return this.staffsService.create(createStaffDTO, ctx.school, requestingUser);
  }

  @Get('')
  @ApiOperation({ summary: 'Get staffs' })
  @ResponseMessage(STAFFS_FETCHED)
  @UseGuards(SchoolContextGuard, PermissionGuard)
  @RequirePermission('read:users')
  async getUsers(
    @Query() listFilterDTO: ListFilterDTO,
    @GetSchoolContext() ctx: SchoolContext,
  ) {
    return this.staffsService.getStaffs(listFilterDTO, ctx.school.id);
  }
}

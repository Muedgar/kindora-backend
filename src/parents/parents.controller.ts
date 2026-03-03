import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ResponseMessage, LogActivity } from 'src/common/decorators';
import { PARENT_CREATED, PARENTS_FETCHED } from './messages';
import { ListFilterDTO } from 'src/common/dtos';
import { ParentsService } from './parents.service';
import { CreateParentDto } from './dto/create-parent.dto';
import { JwtAuthGuard, PermissionGuard, SchoolContextGuard } from 'src/auth/guards';
import { GetSchoolContext, GetUser, RequirePermission } from 'src/auth/decorators';
import { SchoolContext } from 'src/auth/interfaces';
import { User } from 'src/users/entities';

@ApiTags('Parents')
@Controller('parents')
@UseGuards(JwtAuthGuard)
export class ParentsController {
  constructor(private readonly parentsService: ParentsService) {}

  @Post('create')
  @ApiOperation({ summary: 'Create a parent' })
  @ResponseMessage(PARENT_CREATED)
  @LogActivity({ action: 'create:parent', resource: 'parent', includeBody: true })
  @UseGuards(SchoolContextGuard, PermissionGuard)
  @RequirePermission('manage:users')
  async createParent(
    @Body() createParentDTO: CreateParentDto,
    @GetUser() requestingUser: User,
    @GetSchoolContext() ctx: SchoolContext,
  ) {
    return this.parentsService.create(createParentDTO, ctx.school, requestingUser);
  }

  @Get('')
  @ApiOperation({ summary: 'Get parents' })
  @ResponseMessage(PARENTS_FETCHED)
  @UseGuards(SchoolContextGuard, PermissionGuard)
  @RequirePermission('read:users')
  async getParents(
    @Query() listFilterDTO: ListFilterDTO,
    @GetSchoolContext() ctx: SchoolContext,
  ) {
    return this.parentsService.getParents(listFilterDTO, ctx.school.id);
  }
}

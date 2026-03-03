import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  GetSchoolContext,
  GetUser,
  RequirePermission,
} from 'src/auth/decorators';
import {
  JwtAuthGuard,
  ParentGuard,
  PermissionGuard,
  SchoolContextGuard,
} from 'src/auth/guards';
import { SchoolContext } from 'src/auth/interfaces/school-context.interface';
import { ResponseMessage } from 'src/common/decorators';
import { User } from 'src/users/entities';
import { PARENT_CHILDREN_FETCHED } from 'src/reports/messages/success';
import { ParentChildrenService } from '../services/parent-children.service';

@ApiTags('Parent Access')
@ApiBearerAuth()
@Controller('parent')
@UseGuards(JwtAuthGuard, SchoolContextGuard, PermissionGuard, ParentGuard)
export class ParentChildrenController {
  constructor(private readonly parentChildrenService: ParentChildrenService) {}

  @Get('children')
  @ApiOperation({ summary: "List authenticated parent's children" })
  @ResponseMessage(PARENT_CHILDREN_FETCHED)
  @RequirePermission('read:students')
  getChildren(@GetSchoolContext() ctx: SchoolContext, @GetUser() user: User) {
    return this.parentChildrenService.getChildren(ctx.school, user);
  }
}

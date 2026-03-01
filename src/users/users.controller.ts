import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ResponseMessage, LogActivity } from 'src/common/decorators';
import { ListFilterDTO } from 'src/common/dtos';
import { RegisterUserDTO, UpdateUserDTO } from './dtos';
import { CreateUserDTO } from './dtos/create-user.dto';
import {
  USERS_FETCHED,
  USER_2FA_ACTIVATED,
  USER_2FA_DEACTIVATED,
  USER_ACTIVATED,
  USER_CREATED,
  USER_DEACTIVATED,
  USER_DELETED,
  USER_FETCHED,
} from './messages';
import { UserService } from './users.service';
import { JwtAuthGuard, PermissionGuard, SchoolContextGuard } from 'src/auth/guards';
import { GetSchoolContext, GetUser, RequirePermission } from 'src/auth/decorators';
import { SchoolContext } from 'src/auth/interfaces';
import { User } from './entities';

@Controller('users')
@ApiTags('Users')
export class UserController {
  constructor(private userService: UserService) {}

  /**
   * POST /users/register
   * Bootstrap endpoint — creates the very first super-admin + school.
   * No auth required (called before any school exists).
   */
  @Post('register')
  @ApiOperation({ summary: 'Register a super user' })
  @ResponseMessage(USER_CREATED)
  async registerUser(@Body() registerUserDTO: RegisterUserDTO) {
    return this.userService.registerUser(registerUserDTO);
  }

  /**
   * POST /users/create
   * Creates a new user atomically (User + SchoolMember + SchoolMemberRole).
   * Requires a valid school context — the new user is enrolled in the
   * school identified by X-School-Id.
   */
  @Post('create')
  @ApiOperation({ summary: 'Create a user in the current school' })
  @ResponseMessage(USER_CREATED)
  @UseGuards(JwtAuthGuard, SchoolContextGuard, PermissionGuard)
  @RequirePermission('manage:users')
  @LogActivity({ action: 'create:user', resource: 'user', includeBody: true })
  async createUser(
    @Body() createUserDTO: CreateUserDTO,
    @GetUser() requestingUser: User,
    @GetSchoolContext() ctx: SchoolContext,
  ) {
    return this.userService.createUser(createUserDTO, ctx.school, requestingUser);
  }

  /**
   * GET /users
   * Returns a paginated list of users scoped to the current school.
   * Requires X-School-Id — prevents cross-school data leakage.
   */
  @Get('')
  @ApiOperation({ summary: 'Get users in the current school' })
  @ResponseMessage(USERS_FETCHED)
  @UseGuards(JwtAuthGuard, SchoolContextGuard, PermissionGuard)
  @RequirePermission('read:users')
  async getUsers(
    @Query() listFilterDTO: ListFilterDTO,
    @GetSchoolContext() ctx: SchoolContext,
  ) {
    return this.userService.getUsers(listFilterDTO, ctx.school.id);
  }

  /**
   * GET /users/:id
   * Returns a single user. (No school filter — used for profile lookups.)
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get user by id' })
  @ResponseMessage(USER_FETCHED)
  @UseGuards(JwtAuthGuard)
  async getUser(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
    return this.userService.getUser(id);
  }

  /**
   * PATCH /users/:id
   * Updates a user's profile. Verifies the user belongs to the
   * caller's school before applying changes.
   */
  @Patch(':id')
  @ApiOperation({ summary: 'Update a user' })
  @UseGuards(JwtAuthGuard, SchoolContextGuard, PermissionGuard)
  @RequirePermission('manage:users')
  @LogActivity({ action: 'update:user', resource: 'user', includeBody: true })
  async updateUser(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() updateUserDTO: UpdateUserDTO,
    @GetSchoolContext() ctx: SchoolContext,
  ) {
    return this.userService.updateUser(id, updateUserDTO, ctx.school.id);
  }

  @Patch(':id/activate')
  @ApiOperation({ summary: 'Activate user' })
  @ResponseMessage(USER_ACTIVATED)
  @UseGuards(JwtAuthGuard)
  async activateUser(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ) {
    return this.userService.activateUser(id);
  }

  @Patch(':id/deactivate')
  @ApiOperation({ summary: 'Deactivate user' })
  @ResponseMessage(USER_DEACTIVATED)
  @UseGuards(JwtAuthGuard)
  @LogActivity({ action: 'deactivate:user', resource: 'user' })
  async deactivateUser(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ) {
    return this.userService.deactivateUser(id);
  }

  @Patch(':id/activate-2fa')
  @ApiOperation({ summary: 'Activate two factor authentication' })
  @ResponseMessage(USER_2FA_ACTIVATED)
  @UseGuards(JwtAuthGuard)
  async activate2FA(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ) {
    return this.userService.activate2FA(id);
  }

  @Patch(':id/deactivate-2fa')
  @ApiOperation({ summary: 'Deactivate two factor authentication' })
  @ResponseMessage(USER_2FA_DEACTIVATED)
  @UseGuards(JwtAuthGuard)
  async deactivate2FA(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ) {
    return this.userService.deactivate2FA(id);
  }

  /**
   * DELETE /users/:id
   * Deletes a user. Guards:
   * - User must be a member of the caller's school (school scoping).
   * - Super-admin users cannot be deleted via this endpoint.
   */
  @Delete(':id')
  @ApiOperation({ summary: 'Delete user' })
  @ResponseMessage(USER_DELETED)
  @UseGuards(JwtAuthGuard, SchoolContextGuard, PermissionGuard)
  @RequirePermission('manage:users')
  @LogActivity({ action: 'delete:user', resource: 'user' })
  async deleteUser(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @GetSchoolContext() ctx: SchoolContext,
  ) {
    return this.userService.deleteUser(id, ctx.school.id);
  }
}

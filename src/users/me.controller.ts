import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/auth/guards';
import { GetUser } from 'src/auth/decorators';
import { ResponseMessage } from 'src/common/decorators';
import { User } from './entities';
import { MeService } from './me.service';
import { ME_FETCHED, MY_SCHOOLS_FETCHED, SCHOOL_SELECTED } from './messages';

/**
 * MeController — endpoints for the authenticated user to inspect and manage
 * their own identity and school memberships.
 *
 * All routes require a valid JWT (JwtAuthGuard).
 * No school context (X-School-Id) is required since these routes operate
 * on the user's own data across all schools.
 */
@Controller('me')
@ApiTags('Me')
@UseGuards(JwtAuthGuard)
export class MeController {
  constructor(private readonly meService: MeService) {}

  /**
   * GET /me
   * Returns the authenticated user's public identity (no school/role data).
   */
  @Get()
  @ApiOperation({ summary: "Get the authenticated user's profile" })
  @ResponseMessage(ME_FETCHED)
  async getMe(@GetUser() user: User) {
    return this.meService.getMe(user.id);
  }

  /**
   * GET /me/schools
   * Returns all school memberships for the authenticated user,
   * including role assignments and computed permission slugs.
   */
  @Get('schools')
  @ApiOperation({ summary: "Get the authenticated user's school memberships" })
  @ResponseMessage(MY_SCHOOLS_FETCHED)
  async getMySchools(@GetUser() user: User) {
    return this.meService.getMySchools(user.id);
  }

  /**
   * PATCH /me/schools/:schoolId/select
   * Sets the given school as the user's active (default) school.
   * Clears isDefault on all other memberships for this user.
   */
  @Patch('schools/:schoolId/select')
  @ApiOperation({ summary: 'Switch active school' })
  @HttpCode(HttpStatus.OK)
  @ResponseMessage(SCHOOL_SELECTED)
  async selectSchool(
    @GetUser() user: User,
    @Param('schoolId', new ParseUUIDPipe({ version: '4' })) schoolId: string,
  ) {
    return this.meService.selectSchool(user.id, schoolId);
  }
}

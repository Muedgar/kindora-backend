import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ListFilterDTO } from 'src/common/dtos';
import { PermissionSerializer } from './serializers/permission.serializer';
import { ResponseMessage } from 'src/common/decorators';
import { PermissionsService } from './permissions.service';
import { PERMISSIONS_FETCHED } from './constants';
import { JwtAuthGuard, PermissionGuard, SchoolContextGuard } from 'src/auth/guards';
import { RequirePermission } from 'src/auth/decorators';

@Controller('permissions')
@ApiTags('Permissions')
@UseGuards(JwtAuthGuard, SchoolContextGuard, PermissionGuard)
export class PermissionsController {
  constructor(private permissionService: PermissionsService) {}

  @Get('')
  @ApiOperation({ summary: 'Get permissions' })
  @ResponseMessage(PERMISSIONS_FETCHED)
  @RequirePermission('manage:school')
  async getPermissions(@Query() listFilterDto: ListFilterDTO) {
    return this.permissionService.getPermissions(listFilterDto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get permission' })
  @ResponseMessage(PERMISSIONS_FETCHED)
  @RequirePermission('manage:school')
  async getPermission(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ) {
    const permission = await this.permissionService.getPermission(id);

    return new PermissionSerializer(permission);
  }
}

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
import { ResponseMessage } from 'src/common/decorators';
import { ListFilterDTO } from 'src/common/dtos';
import { UpdateRoleDTO } from './dtos';
import { CreateRoleDTO } from './dtos/create-role.dto';
import {
  ROLES_FETCHED,
  ROLE_ACTIVATED,
  ROLE_CREATED,
  ROLE_DEACTIVATED,
  ROLE_DELETED,
  ROLE_FETCHED,
  ROLE_UPDATED,
} from './messages';
import { RoleService } from './roles.service';
import { RoleSerializer } from './serializers/role.serializer';
import { JwtAuthGuard } from 'src/auth/guards';

@ApiTags('Roles')
@Controller('roles')
@UseGuards(JwtAuthGuard)
export class RoleController {
  constructor(private roleService: RoleService) {}

  @Post('create')
  @ApiOperation({ summary: 'create a new role' })
  @ResponseMessage(ROLE_CREATED)
  async createRole(@Body() createRoleDTO: CreateRoleDTO) {
    return this.roleService.createRole(createRoleDTO);
  }

  @Get('')
  @ApiOperation({ summary: 'Get roles' })
  @ResponseMessage(ROLES_FETCHED)
  async getRoles(@Query() listFilerDTO: ListFilterDTO) {
    return this.roleService.getRoles(listFilerDTO);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get role by id' })
  @ResponseMessage(ROLE_FETCHED)
  async getRole(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
    const role = await this.roleService.getRole(id);
    return new RoleSerializer(role);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update role' })
  @ResponseMessage(ROLE_UPDATED)
  async updateRole(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() updateRoleDTO: UpdateRoleDTO,
  ) {
    return this.roleService.updateRole(id, updateRoleDTO);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete role' })
  @ResponseMessage(ROLE_DELETED)
  async deleteRole(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ) {
    return this.roleService.deleteRole(id);
  }

  @Patch(':id/activate')
  @ApiOperation({ summary: 'Activate role' })
  @ResponseMessage(ROLE_ACTIVATED)
  async activateRole(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ) {
    return this.roleService.activateRole(id);
  }

  @Patch(':id/deactivate')
  @ApiOperation({ summary: 'Deactivate role' })
  @ResponseMessage(ROLE_DEACTIVATED)
  async deactivateRole(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ) {
    return this.roleService.deactivateRole(id);
  }
}

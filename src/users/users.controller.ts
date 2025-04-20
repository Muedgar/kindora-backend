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
import { ChangePasswordDTO, RegisterUserDTO, UpdateUserDTO } from './dtos';
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
import { JwtAuthGuard } from 'src/auth/guards';

@Controller('users')
@ApiTags('Users')
export class UserController {
  constructor(private userService: UserService) {}

  @Post('register')
  @ApiOperation({ summary: 'Register a super user' })
  @ResponseMessage(USER_CREATED)
  async registerUser(@Body() registerUserDTO: RegisterUserDTO) {
    return this.userService.registerUser(registerUserDTO);
  }

  @Post('create/:id')
  @ApiOperation({ summary: 'Create a user' })
  @ResponseMessage(USER_CREATED)
  @UseGuards(JwtAuthGuard)
  async createUser(
    @Body() createUserDTO: CreateUserDTO,
    @Param('id') id: string,
  ) {
    return this.userService.createUser(createUserDTO, id);
  }

  @Get('')
  @ApiOperation({ summary: 'Get users' })
  @ResponseMessage(USERS_FETCHED)
  @UseGuards(JwtAuthGuard)
  async getUsers(@Query() listFilterDTO: ListFilterDTO) {
    return this.userService.getUsers(listFilterDTO);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get user by id' })
  @ResponseMessage(USER_FETCHED)
  @UseGuards(JwtAuthGuard)
  async getUser(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
    const user = await this.userService.getUser(id);
    return user;
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a user' })
  @UseGuards(JwtAuthGuard)
  async updateUser(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateUserDTO: UpdateUserDTO,
  ) {
    return this.userService.updateUser(id, updateUserDTO);
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

  @Patch(':id/change-password')
  @ApiOperation({ summary: 'Change user password' })
  @ResponseMessage('Password changed successfully')
  @UseGuards(JwtAuthGuard)
  async changePassword(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() changePasswordDto: ChangePasswordDTO,
  ) {
    return this.userService.changePassword(id, changePasswordDto.password);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete user' })
  @ResponseMessage(USER_DELETED)
  @UseGuards(JwtAuthGuard)
  async deleteUser(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ) {
    return this.userService.deleteUser(id);
  }
}

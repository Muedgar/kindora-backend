import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { StaffsService } from './staffs.service';
import { CreateStaffDto } from './dto/create-staff.dto';
import { ApiOperation } from '@nestjs/swagger';
import { ResponseMessage } from 'src/common/decorators';
import { STAFF_CREATED, STAFFS_FETCHED } from './messages';
import { ListFilterDTO } from 'src/common/dtos';
import { JwtAuthGuard } from 'src/auth/guards';
import { GetUser } from 'src/auth/decorators';
import { User } from 'src/users/entities';

@Controller('staffs')
@UseGuards(JwtAuthGuard)
export class StaffsController {
  constructor(private readonly staffsService: StaffsService) {}

  @Post('create')
  @ApiOperation({ summary: 'Create a staff' })
  @ResponseMessage(STAFF_CREATED)
  async createUser(
    @Body() createStaffDTO: CreateStaffDto,
    @GetUser() user: User,
  ) {
    const userId = user.id;
    return this.staffsService.create(createStaffDTO, userId);
  }

  @Get('')
  @ApiOperation({ summary: 'Get staffs' })
  @ResponseMessage(STAFFS_FETCHED)
  async getUsers(@Query() listFilterDTO: ListFilterDTO) {
    return this.staffsService.getStaffs(listFilterDTO);
  }
}

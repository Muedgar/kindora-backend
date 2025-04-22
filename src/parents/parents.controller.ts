import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation } from '@nestjs/swagger';
import { ResponseMessage } from 'src/common/decorators';
import { PARENT_CREATED, PARENTS_FETCHED } from './messages';
import { ListFilterDTO } from 'src/common/dtos';
import { ParentsService } from './parents.service';
import { CreateParentDto } from './dto/create-parent.dto';
import { JwtAuthGuard } from 'src/auth/guards';
import { GetUser } from 'src/auth/decorators';
import { User } from 'src/users/entities';

@Controller('parents')
@UseGuards(JwtAuthGuard)
export class ParentsController {
  constructor(private readonly parentsService: ParentsService) {}

  @Post('create/:id')
  @ApiOperation({ summary: 'Create a parent' })
  @ResponseMessage(PARENT_CREATED)
  async createParent(
    @Body() createParentDTO: CreateParentDto,
    @GetUser() user: User,
  ) {
    const userId = user.id;
    return this.parentsService.create(createParentDTO, userId);
  }

  @Get('')
  @ApiOperation({ summary: 'Get parents' })
  @ResponseMessage(PARENTS_FETCHED)
  async getParents(@Query() listFilterDTO: ListFilterDTO) {
    return this.parentsService.getParents(listFilterDTO);
  }
}

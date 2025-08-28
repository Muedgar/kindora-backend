import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ResponseMessage } from 'src/common/decorators';
import { ListFilterDTO } from 'src/common/dtos';
import { GradingLevelService } from '../services/grading-level.service';
import { GRADING_LEVEL_CREATED, GRADING_LEVELS_FETCHED } from '../messages';
import { CreateGradingLevelDto } from '../dto/grading-level.dto';
import { JwtAuthGuard } from 'src/auth/guards';
import { User } from 'src/users/entities';
import { GetUser } from 'src/auth/decorators';

@ApiTags('Grading Level')
@Controller('grading-level')
@UseGuards(JwtAuthGuard)
export class GradingLevelController {
  constructor(private gradingLevelService: GradingLevelService) {}

  @Post('create')
  @ApiOperation({ summary: 'create a new grading level' })
  @ResponseMessage(GRADING_LEVEL_CREATED)
  createGradingLevel(
    @Body() createGradingLevelDto: CreateGradingLevelDto,
    @GetUser() user: User,
  ) {
    const userId = user.id;
    return this.gradingLevelService.createGradingLevel(
      createGradingLevelDto,
      userId,
    );
  }

  @Get('')
  @ApiOperation({ summary: 'Get grading levels' })
  @ResponseMessage(GRADING_LEVELS_FETCHED)
  async getGradingLevels(@Query() listFilerDTO: ListFilterDTO) {
    return this.gradingLevelService.findAll(listFilerDTO);
  }
}

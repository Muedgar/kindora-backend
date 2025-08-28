import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { GradingLevel } from '../entities';
import { Repository } from 'typeorm';
import { ListFilterDTO } from 'src/common/dtos';
import { FilterResponse } from 'src/common/interfaces';
import { ListFilterService } from 'src/common/services';
import { CreateGradingLevelDto } from '../dto/grading-level.dto';
import { GradingLevelSerializer } from '../serializers/grading-level.serializer';
import { UserService } from 'src/users/users.service';
import { GRADING_LEVEL_ALREADY_EXISTS } from '../messages';

@Injectable()
export class GradingLevelService {
  constructor(
    @InjectRepository(GradingLevel)
    private gradingLevelRepository: Repository<GradingLevel>,
    private userService: UserService,
  ) {}
  async createGradingLevel(
    createGradingLevelDto: CreateGradingLevelDto,
    userId: string,
  ): Promise<GradingLevelSerializer> {
    const createdBy = await this.userService.findOne(userId);
    const existingGradingLevel = await this.gradingLevelRepository.findOne({
      where: {
        name: createGradingLevelDto.name,
      },
    });

    if (existingGradingLevel)
      throw new BadRequestException(GRADING_LEVEL_ALREADY_EXISTS);

    const gradingLevel = this.gradingLevelRepository.create({
      ...createGradingLevelDto,
      createdBy,
    });

    const savedGradingLevel =
      await this.gradingLevelRepository.save(gradingLevel);
    return new GradingLevelSerializer(savedGradingLevel);
  }

  async getGradingLevels(ids: string[]): Promise<GradingLevel[]> {
    const gradingLevels: GradingLevel[] = [];
    for (const id of ids) {
      const gradingLevel = await this.gradingLevelRepository.findOne({
        where: {
          id,
        },
      });
      if (gradingLevel) gradingLevels.push(gradingLevel);
    }

    return gradingLevels;
  }

  async findAll(
    filters: ListFilterDTO,
  ): Promise<FilterResponse<GradingLevelSerializer>> {
    const listFilterService = new ListFilterService(
      this.gradingLevelRepository,
      GradingLevelSerializer,
    );
    const searchFields = ['name'];

    return listFilterService.filter({
      filters,
      searchFields,
    }) as Promise<FilterResponse<GradingLevelSerializer>>;
  }
}

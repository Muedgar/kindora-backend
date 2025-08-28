import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Activity } from '../entities';
import { FindManyOptions, Repository } from 'typeorm';
import { ListFilterDTO } from 'src/common/dtos';
import { FilterResponse } from 'src/common/interfaces';
import { ListFilterService } from 'src/common/services';
import { UserService } from 'src/users/users.service';
import { ACTIVITY_ALREADY_EXISTS } from '../messages';
import { CreateActivityDto } from '../dto/activity.dto';
import { GradingLevelService } from './grading-level.service';
import { ActivitySerializer } from '../serializers/activity.serializer';

@Injectable()
export class ActivityService {
  constructor(
    @InjectRepository(Activity)
    private activityRepository: Repository<Activity>,
    private userService: UserService,
    private gradingLevelService: GradingLevelService,
  ) {}
  async createActivity(
    createActivityDto: CreateActivityDto,
    userId: string,
  ): Promise<ActivitySerializer> {
    const createdBy = await this.userService.findOne(userId);
    const existingActivityLevel = await this.activityRepository.findOne({
      where: {
        name: createActivityDto.name,
      },
    });

    if (existingActivityLevel)
      throw new BadRequestException(ACTIVITY_ALREADY_EXISTS);

    const gradingLevels = await this.gradingLevelService.getGradingLevels(
      createActivityDto.gradingLevels,
    );

    const activity = this.activityRepository.create({
      ...createActivityDto,
      gradingLevels,
      createdBy,
    });

    const savedActivity = await this.activityRepository.save(activity);
    return new ActivitySerializer(savedActivity);
  }

  async getActivities(ids: string[]): Promise<Activity[]> {
    const activities: Activity[] = [];
    for (const id of ids) {
      const activity = await this.activityRepository.findOne({
        where: {
          id,
        },
      });
      if (activity) activities.push(activity);
    }

    return activities;
  }
  async findAll(
    filters: ListFilterDTO,
  ): Promise<FilterResponse<ActivitySerializer>> {
    const listFilterService = new ListFilterService(
      this.activityRepository,
      ActivitySerializer,
    );
    const searchFields = ['name', 'description'];
    const options: FindManyOptions<Activity> = { relations: ['gradingLevels'] };

    return listFilterService.filter({
      filters,
      searchFields,
      options,
    }) as Promise<FilterResponse<ActivitySerializer>>;
  }
}

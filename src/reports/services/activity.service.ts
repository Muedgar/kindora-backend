import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Activity } from '../entities';
import { FindManyOptions, Repository } from 'typeorm';
import { ListFilterDTO } from 'src/common/dtos';
import { FilterResponse } from 'src/common/interfaces';
import { ListFilterService } from 'src/common/services';
import { UserService } from 'src/users/users.service';
import { ACTIVITY_ALREADY_EXISTS, ACTIVITY_NOT_FOUND } from '../messages';
import { CreateActivityDto } from '../dto/activity.dto';
import { GradingLevelService } from './grading-level.service';
import { ActivitySerializer } from '../serializers/activity.serializer';
import { School } from 'src/schools/entities/school.entity';

@Injectable()
export class ActivityService {
  constructor(
    @InjectRepository(Activity)
    private readonly activityRepository: Repository<Activity>,
    private readonly userService: UserService,
    private readonly gradingLevelService: GradingLevelService,
    private readonly listFilterService: ListFilterService,
  ) {}

  /**
   * Create a new activity scoped to the given school.
   * Name uniqueness is enforced per school (not globally).
   */
  async createActivity(
    dto: CreateActivityDto,
    school: School,
    userId: string,
  ): Promise<ActivitySerializer> {
    const createdBy = await this.userService.findOne(userId);

    const existing = await this.activityRepository.findOne({
      where: { name: dto.name, school: { pkid: school.pkid } },
    });
    if (existing) throw new BadRequestException(ACTIVITY_ALREADY_EXISTS);

    const gradingLevels = await this.gradingLevelService.getGradingLevels(
      dto.gradingLevels,
    );

    const activity = this.activityRepository.create({
      name: dto.name,
      description: dto.description,
      gradingType: dto.gradingType,
      gradingConfig: dto.gradingConfig ?? null,
      school,
      createdBy,
      gradingLevels,
    });

    const saved = await this.activityRepository.save(activity);
    return new ActivitySerializer(saved);
  }

  /**
   * Resolve activity UUIDs → Activity entities, filtered to the given school.
   * Silently skips IDs not found or belonging to a different school.
   * Used by LearningAreaService and ActivityTemplateService.
   */
  async getActivities(ids: string[], school?: School): Promise<Activity[]> {
    const activities: Activity[] = [];
    for (const id of ids) {
      const where = school
        ? { id, school: { pkid: school.pkid } }
        : { id };
      const activity = await this.activityRepository.findOne({ where });
      if (activity) activities.push(activity);
    }
    return activities;
  }

  /**
   * Paginated list of activities for the given school.
   */
  async findAll(
    school: School,
    filters: ListFilterDTO,
  ): Promise<FilterResponse<ActivitySerializer>> {
    const searchFields = ['name', 'description'];
    const options: FindManyOptions<Activity> = {
      where: { school: { pkid: school.pkid } },
      relations: ['gradingLevels'],
    };

    return this.listFilterService.filter({
      repository: this.activityRepository,
      serializer: ActivitySerializer,
      filters,
      searchFields,
      options,
    }) as Promise<FilterResponse<ActivitySerializer>>;
  }

  /**
   * Retrieve a single activity by UUID, scoped to the school.
   */
  async findOne(id: string, school: School): Promise<ActivitySerializer> {
    const activity = await this.activityRepository.findOne({
      where: { id, school: { pkid: school.pkid } },
      relations: ['gradingLevels', 'learningAreas'],
    });
    if (!activity) throw new NotFoundException(ACTIVITY_NOT_FOUND);
    return new ActivitySerializer(activity);
  }
}

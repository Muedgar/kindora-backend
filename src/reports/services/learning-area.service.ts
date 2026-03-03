import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindManyOptions, Repository } from 'typeorm';
import { LearningArea } from '../entities/learning-area.entity';
import { Activity } from '../entities/activity.entity';
import { School } from 'src/schools/entities/school.entity';
import { User } from 'src/users/entities';
import { UserService } from 'src/users/users.service';
import { ListFilterService } from 'src/common/services';
import { ListFilterDTO } from 'src/common/dtos';
import { FilterResponse } from 'src/common/interfaces';
import { LearningAreaSerializer } from '../serializers/learning-area.serializer';
import {
  CreateLearningAreaDto,
  UpdateLearningAreaDto,
} from '../dto/learning-area.dto';
import {
  LEARNING_AREA_ALREADY_EXISTS,
  LEARNING_AREA_NOT_FOUND,
} from '../messages';

@Injectable()
export class LearningAreaService {
  constructor(
    @InjectRepository(LearningArea)
    private readonly learningAreaRepository: Repository<LearningArea>,
    @InjectRepository(Activity)
    private readonly activityRepository: Repository<Activity>,
    private readonly userService: UserService,
    private readonly listFilterService: ListFilterService,
  ) {}

  /**
   * Create a new learning area for the given school.
   * Name must be unique within the school.
   */
  async create(
    dto: CreateLearningAreaDto,
    school: School,
    userId: string,
  ): Promise<LearningAreaSerializer> {
    const createdBy: User = await this.userService.findOne(userId);

    // Name uniqueness is enforced per school (not globally)
    const existing = await this.learningAreaRepository.findOne({
      where: { name: dto.name, school: { pkid: school.pkid } },
    });
    if (existing) throw new BadRequestException(LEARNING_AREA_ALREADY_EXISTS);

    const activities = dto.activityIds?.length
      ? await this.resolveActivities(dto.activityIds, school)
      : [];

    const area = this.learningAreaRepository.create({
      name: dto.name,
      description: dto.description,
      school,
      createdBy,
      activities,
    });

    const saved = await this.learningAreaRepository.save(area);
    return new LearningAreaSerializer(saved);
  }

  /**
   * Paginated list of all learning areas for the given school.
   */
  async findAll(
    school: School,
    filters: ListFilterDTO,
  ): Promise<FilterResponse<LearningAreaSerializer>> {
    const searchFields = ['name', 'description'];
    const options: FindManyOptions<LearningArea> = {
      where: { school: { pkid: school.pkid } },
      relations: ['activities'],
    };

    return this.listFilterService.filter({
      repository: this.learningAreaRepository,
      serializer: LearningAreaSerializer,
      filters,
      searchFields,
      options,
    }) as Promise<FilterResponse<LearningAreaSerializer>>;
  }

  /**
   * Retrieve a single learning area by id, scoped to the school.
   */
  async findOne(id: string, school: School): Promise<LearningAreaSerializer> {
    const area = await this.learningAreaRepository.findOne({
      where: { id, school: { pkid: school.pkid } },
      relations: ['activities', 'activities.gradingLevels'],
    });
    if (!area) throw new NotFoundException(LEARNING_AREA_NOT_FOUND);
    return new LearningAreaSerializer(area);
  }

  /**
   * Update name, description, and/or activity assignments.
   */
  async update(
    id: string,
    dto: UpdateLearningAreaDto,
    school: School,
  ): Promise<LearningAreaSerializer> {
    const area = await this.learningAreaRepository.findOne({
      where: { id, school: { pkid: school.pkid } },
      relations: ['activities'],
    });
    if (!area) throw new NotFoundException(LEARNING_AREA_NOT_FOUND);

    // Check name uniqueness if name is being changed
    if (dto.name && dto.name !== area.name) {
      const conflict = await this.learningAreaRepository.findOne({
        where: { name: dto.name, school: { pkid: school.pkid } },
      });
      if (conflict) throw new BadRequestException(LEARNING_AREA_ALREADY_EXISTS);
      area.name = dto.name;
    }

    if (dto.description !== undefined) area.description = dto.description;

    if (dto.activityIds !== undefined) {
      area.activities = dto.activityIds.length
        ? await this.resolveActivities(dto.activityIds, school)
        : [];
    }

    const saved = await this.learningAreaRepository.save(area);
    return new LearningAreaSerializer(saved);
  }

  /**
   * Soft-delete a learning area by removing it from the DB.
   * AppBaseEntity does not use soft-delete by default, so we use hard delete.
   * Call after verifying no SENT reports reference this area (Phase 3).
   */
  async remove(id: string, school: School): Promise<void> {
    const area = await this.learningAreaRepository.findOne({
      where: { id, school: { pkid: school.pkid } },
    });
    if (!area) throw new NotFoundException(LEARNING_AREA_NOT_FOUND);
    await this.learningAreaRepository.remove(area);
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  /**
   * Resolve activity UUIDs to Activity entities, filtering only those
   * that belong to the requesting school for tenant isolation.
   */
  private async resolveActivities(
    ids: string[],
    school: School,
  ): Promise<Activity[]> {
    const activities: Activity[] = [];
    for (const id of ids) {
      const activity = await this.activityRepository.findOne({
        where: { id, school: { pkid: school.pkid } },
      });
      if (activity) activities.push(activity);
    }
    return activities;
  }
}

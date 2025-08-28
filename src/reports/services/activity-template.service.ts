import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ActivitiesTemplate } from '../entities';
import { FindManyOptions, Repository } from 'typeorm';
import { CreateActivitiesTemplateDto } from '../dto/create-activity-template.dto';
import { ActivitiesTemplateSerializer } from '../serializers';
import { ListFilterDTO } from 'src/common/dtos';
import { FilterResponse } from 'src/common/interfaces';
import { ListFilterService } from 'src/common/services';
import { ActivityService } from './activity.service';
import { UserService } from 'src/users/users.service';
import { TEMPLATE_ALREADY_EXISTS } from '../messages';

@Injectable()
export class ActivityTemplateService {
  constructor(
    @InjectRepository(ActivitiesTemplate)
    private activitiesTemplateRepository: Repository<ActivitiesTemplate>,
    private activityService: ActivityService,
    private userService: UserService,
  ) {}
  async createActivitiesTemplate(
    createActivitiesTemplateDto: CreateActivitiesTemplateDto,
    userId: string,
  ): Promise<ActivitiesTemplateSerializer> {
    const createdBy = await this.userService.findOne(userId);
    const existingActivitiesTemplate =
      await this.activitiesTemplateRepository.findOne({
        where: {
          name: createActivitiesTemplateDto.name,
        },
      });

    if (existingActivitiesTemplate)
      throw new BadRequestException(TEMPLATE_ALREADY_EXISTS);

    const activities = await this.activityService.getActivities(
      createActivitiesTemplateDto.activities,
    );
    const activityTemplate = this.activitiesTemplateRepository.create({
      ...createActivitiesTemplateDto,
      activities,
      createdBy,
    });

    const savedActivityTemplate =
      await this.activitiesTemplateRepository.save(activityTemplate);
    return new ActivitiesTemplateSerializer(savedActivityTemplate);
  }

  async findAll(
    filters: ListFilterDTO,
  ): Promise<FilterResponse<ActivitiesTemplateSerializer>> {
    const listFilterService = new ListFilterService(
      this.activitiesTemplateRepository,
      ActivitiesTemplateSerializer,
    );
    const searchFields = ['name'];

    const options: FindManyOptions<ActivitiesTemplate> = {
      relations: ['createdBy', 'activities'],
    };

    return listFilterService.filter({
      filters,
      searchFields,
      options,
    }) as Promise<FilterResponse<ActivitiesTemplateSerializer>>;
  }
}

import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindManyOptions, Repository } from 'typeorm';
import { UserService } from 'src/users/users.service';
import { plainToInstance } from 'class-transformer';
import { ListFilterDTO } from 'src/common/dtos';
import { FilterResponse } from 'src/common/interfaces';
import { ListFilterService } from 'src/common/services';
import { ClassroomSerializer } from './serializers';
import { Classroom } from './entities/classroom.entity';
import { CreateClassroomDto } from './dto/create-classroom.dto';
import { CLASSROOM_EXISTS, CLASSROOM_NOT_FOUND } from './messages';

@Injectable()
export class ClassroomsService {
  constructor(
    @InjectRepository(Classroom)
    private classroomRepository: Repository<Classroom>,
    private userService: UserService,
  ) {}

  async create(
    createClassroomDto: CreateClassroomDto,
    requestUser: string,
  ): Promise<ClassroomSerializer> {
    const userFound = await this.userService.getUser(requestUser);

    const foundClassroom = await this.classroomRepository.findOne({
      where: {
        name: createClassroomDto.name,
      },
    });

    if (foundClassroom) throw new BadRequestException(CLASSROOM_EXISTS);

    const classroom = this.classroomRepository.create({
      ...createClassroomDto,
      capacity: Number(createClassroomDto.capacity),
      createdBy: userFound,
    });
    const savedClassroom = await this.classroomRepository.save(classroom);
    return plainToInstance(ClassroomSerializer, savedClassroom, {
      excludeExtraneousValues: true,
    });
  }

  async getClassrooms(
    filters: ListFilterDTO,
  ): Promise<FilterResponse<ClassroomSerializer>> {
    const listFilterService = new ListFilterService(
      this.classroomRepository,
      ClassroomSerializer,
    );
    const searchFields = ['name', 'ageGroup', 'capacity'];

    const options: FindManyOptions<Classroom> = {
      relations: ['createdBy', 'students'],
    };

    return listFilterService.filter({
      filters,
      searchFields,
      options,
    }) as Promise<FilterResponse<ClassroomSerializer>>;
  }

  async getClassroom(id: string): Promise<Classroom> {
    const classroom = await this.classroomRepository.findOne({
      where: {
        id,
      },
      relations: ['createdBy', 'students'],
    });

    if (!classroom) {
      throw new BadRequestException(CLASSROOM_NOT_FOUND);
    }

    return classroom;
  }
}

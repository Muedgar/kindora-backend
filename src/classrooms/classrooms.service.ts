import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindManyOptions, Repository } from 'typeorm';
import { UserService } from 'src/users/users.service';
import { SchoolService } from 'src/schools/school.service';
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
    private schoolService: SchoolService,
  ) {}

  async create(
    createClassroomDto: CreateClassroomDto,
    requestUser: string,
  ): Promise<ClassroomSerializer> {
    const userFound = await this.userService.getUser(requestUser);
    const branch = await this.schoolService.getBranchById(createClassroomDto.branchId);

    if (!branch) {
      throw new BadRequestException('Branch not found');
    }

    const foundClassroom = await this.classroomRepository.findOne({
      where: {
        name: createClassroomDto.name,
      },
    });

    if (foundClassroom) throw new BadRequestException(CLASSROOM_EXISTS);

    const classroom = this.classroomRepository.create({
      name: createClassroomDto.name,
      ageGroup: createClassroomDto.ageGroup,
      capacity: Number(createClassroomDto.capacity),
      createdBy: userFound,
      branch,
    });
    const savedClassroom = await this.classroomRepository.save(classroom);
    return plainToInstance(ClassroomSerializer, savedClassroom, {
      excludeExtraneousValues: true,
    });
  }

  async getClassrooms(
    filters: ListFilterDTO,
    branchId?: string,
  ): Promise<FilterResponse<ClassroomSerializer>> {
    const listFilterService = new ListFilterService(
      this.classroomRepository,
      ClassroomSerializer,
    );
    const searchFields = ['name', 'ageGroup', 'capacity'];

    const options: FindManyOptions<Classroom> = {
      where: branchId ? { branch: { id: branchId } } : {},
      relations: ['createdBy', 'students', 'branch', 'branch.school'],
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
      relations: ['createdBy', 'students', 'branch', 'branch.school'],
    });

    if (!classroom) {
      throw new BadRequestException(CLASSROOM_NOT_FOUND);
    }

    return classroom;
  }
}

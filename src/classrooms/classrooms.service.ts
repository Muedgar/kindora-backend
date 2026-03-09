import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
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
import { School } from 'src/schools/entities/school.entity';
import { SCHOOL_BRANCH_NOT_FOUND } from 'src/schools/messages';

@Injectable()
export class ClassroomsService {
  constructor(
    @InjectRepository(Classroom)
    private classroomRepository: Repository<Classroom>,
    private userService: UserService,
    private schoolService: SchoolService,
    private listFilterService: ListFilterService,
  ) {}

  async create(
    createClassroomDto: CreateClassroomDto,
    requestUser: string,
    school: School,
  ): Promise<ClassroomSerializer> {
    const userFound = await this.userService.getUser(requestUser);
    const branch = await this.schoolService.getBranchById(createClassroomDto.branchId);

    if (!branch) {
      throw new BadRequestException(SCHOOL_BRANCH_NOT_FOUND);
    }

    const foundClassroom = await this.classroomRepository.findOne({
      where: {
        name: createClassroomDto.name,
        school: { pkid: school.pkid },
      },
    });

    if (foundClassroom) throw new BadRequestException(CLASSROOM_EXISTS);

    const classroom = this.classroomRepository.create({
      name: createClassroomDto.name,
      ageGroup: createClassroomDto.ageGroup,
      capacity: Number(createClassroomDto.capacity),
      createdBy: userFound,
      branch,
      school,
    });
    const savedClassroom = await this.classroomRepository.save(classroom);
    return plainToInstance(ClassroomSerializer, savedClassroom, {
      excludeExtraneousValues: true,
    });
  }

  async getClassrooms(
    filters: ListFilterDTO,
    school: School,
    branchId?: string,
  ): Promise<FilterResponse<ClassroomSerializer>> {
    const searchFields = ['name', 'ageGroup', 'capacity'];

    const where: FindManyOptions<Classroom>['where'] = {
      school: { pkid: school.pkid },
      ...(branchId ? { branch: { id: branchId } } : {}),
    };

    const options: FindManyOptions<Classroom> = {
      where,
      relations: ['createdBy', 'students', 'branch', 'branch.school'],
    };

    return this.listFilterService.filter({
      repository: this.classroomRepository,
      serializer: ClassroomSerializer,
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

  async getClassroomDetails(
    id: string,
    school: School,
    branchId?: string,
  ): Promise<ClassroomSerializer> {
    const classroom = await this.classroomRepository.findOne({
      where: {
        id,
        school: { pkid: school.pkid },
        ...(branchId ? { branch: { id: branchId } } : {}),
      },
      relations: ['createdBy', 'students', 'branch', 'branch.school'],
    });

    if (!classroom) {
      throw new NotFoundException(CLASSROOM_NOT_FOUND);
    }

    return plainToInstance(ClassroomSerializer, classroom, {
      excludeExtraneousValues: true,
    });
  }
}

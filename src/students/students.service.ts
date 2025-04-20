import { Injectable } from '@nestjs/common';
import { CreateStudentDto } from './dto/create-student.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Student } from './entities/student.entity';
import { FindManyOptions, Repository } from 'typeorm';
import { ParentsService } from 'src/parents/parents.service';
import { ClassroomsService } from 'src/classrooms/classrooms.service';
import { StudentSerializer } from './serializers';
import { plainToInstance } from 'class-transformer';
import { ListFilterDTO } from 'src/common/dtos';
import { FilterResponse } from 'src/common/interfaces';
import { ListFilterService } from 'src/common/services';

@Injectable()
export class StudentsService {
  constructor(
    @InjectRepository(Student)
    private studentRepository: Repository<Student>,
    private parentsService: ParentsService,
    private classroomsService: ClassroomsService,
  ) {}
  async create(createStudentDto: CreateStudentDto): Promise<StudentSerializer> {
    const parent = createStudentDto.parentId
      ? await this.parentsService.getParent(createStudentDto.parentId)
      : undefined;
    const classroom = createStudentDto.classroomId
      ? await this.classroomsService.getClassroom(
          createStudentDto.classroomId || '',
        )
      : undefined;
    const studentDto = {
      fullName: createStudentDto.fullName,
      dateOfBirth: createStudentDto.dateOfBirth || undefined,
      gender: createStudentDto.gender || undefined,
      notes: createStudentDto.notes || undefined,
      parent: parent,
      classroom: classroom || undefined,
    };

    const student = this.studentRepository.create({ ...studentDto });
    const savedStudent = await this.studentRepository.save(student);
    return plainToInstance(StudentSerializer, savedStudent, {
      excludeExtraneousValues: true,
    });
  }

  async getStudents(
    filters: ListFilterDTO,
  ): Promise<FilterResponse<StudentSerializer>> {
    const listFilterService = new ListFilterService(
      this.studentRepository,
      StudentSerializer,
    );
    const searchFields = ['fullName', 'dateOfBirth', 'gender'];

    const options: FindManyOptions<Student> = {
      relations: [
        'parent',
        'parent.children',
        'classroom',
        'classroom.students',
      ],
    };

    return listFilterService.filter({
      filters,
      searchFields,
      options,
    }) as Promise<FilterResponse<StudentSerializer>>;
  }
}

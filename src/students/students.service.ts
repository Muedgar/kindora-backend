import { BadRequestException, Injectable } from '@nestjs/common';
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
import { SchoolService } from 'src/schools/school.service';
import { StudentGuardian } from './entities/student-guardian.entity';
import { EGuardianRelationship } from './enums/guardian-relationship.enum';

@Injectable()
export class StudentsService {
  constructor(
    @InjectRepository(Student)
    private studentRepository: Repository<Student>,
    @InjectRepository(StudentGuardian)
    private studentGuardianRepository: Repository<StudentGuardian>,
    private parentsService: ParentsService,
    private classroomsService: ClassroomsService,
    private schoolService: SchoolService,
  ) {}
  async create(createStudentDto: CreateStudentDto): Promise<StudentSerializer> {
    const branch = await this.schoolService.getBranchById(createStudentDto.branchId);
    if (!branch) throw new BadRequestException('Branch not found');

    const classroom = createStudentDto.classroomId
      ? await this.classroomsService.getClassroom(
          createStudentDto.classroomId || '',
        )
      : undefined;

    if (classroom && classroom.branch?.id !== branch.id) {
      throw new BadRequestException(
        'Student branch must match classroom branch.',
      );
    }

    const parent = createStudentDto.parentId
      ? await this.parentsService.getParent(createStudentDto.parentId)
      : undefined;
    const studentDto = {
      fullName: createStudentDto.fullName,
      dateOfBirth: createStudentDto.dateOfBirth || undefined,
      gender: createStudentDto.gender || undefined,
      notes: createStudentDto.notes || undefined,
      branch,
      classroom: classroom || undefined,
    };

    const student = this.studentRepository.create({ ...studentDto });
    const savedStudent = await this.studentRepository.save(student);

    if (parent) {
      await this.studentGuardianRepository.save(
        this.studentGuardianRepository.create({
          student: savedStudent,
          parent,
          relationship: EGuardianRelationship.OTHER,
          canPickup: true,
          isEmergencyContact: false,
        }),
      );
    }

    return plainToInstance(StudentSerializer, savedStudent, {
      excludeExtraneousValues: true,
    });
  }

  async getStudents(
    filters: ListFilterDTO,
    branchId?: string,
  ): Promise<FilterResponse<StudentSerializer>> {
    const listFilterService = new ListFilterService(
      this.studentRepository,
      StudentSerializer,
    );
    const searchFields = ['fullName', 'dateOfBirth', 'gender'];

    const options: FindManyOptions<Student> = {
      where: branchId ? { branch: { id: branchId } } : {},
      relations: [
        'guardians',
        'guardians.parent',
        'guardians.parent.user',
        'classroom',
        'classroom.students',
        'branch',
        'branch.school',
      ],
    };

    return listFilterService.filter({
      filters,
      searchFields,
      options,
    }) as Promise<FilterResponse<StudentSerializer>>;
  }
}

import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CreateStudentDto } from './dto/create-student.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Student } from './entities/student.entity';
import { FindManyOptions, Repository } from 'typeorm';
import { ParentsService } from 'src/parents/parents.service';
import { ClassroomsService } from 'src/classrooms/classrooms.service';
import { StudentGuardianSerializer, StudentSerializer } from './serializers';
import { plainToInstance } from 'class-transformer';
import { ListFilterDTO } from 'src/common/dtos';
import { FilterResponse } from 'src/common/interfaces';
import { ListFilterService } from 'src/common/services';
import { SchoolService } from 'src/schools/school.service';
import { StudentGuardian } from './entities/student-guardian.entity';
import { AddGuardianDto } from './dto/add-guardian.dto';
import { UpdateGuardianDto } from './dto/update-guardian.dto';
import { School } from 'src/schools/entities/school.entity';
import { EGuardianRelationship } from './enums/guardian-relationship.enum';
import {
  GUARDIAN_ALREADY_EXISTS,
  GUARDIAN_NOT_FOUND,
  STUDENT_NOT_FOUND,
} from './messages';
import { SCHOOL_BRANCH_NOT_FOUND } from 'src/schools/messages';

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
    private listFilterService: ListFilterService,
  ) {}

  async create(
    createStudentDto: CreateStudentDto,
    school: School,
  ): Promise<StudentSerializer> {
    const branch = await this.schoolService.getBranchById(createStudentDto.branchId);
    if (!branch) throw new BadRequestException(SCHOOL_BRANCH_NOT_FOUND);

    const classroom = createStudentDto.classroomId
      ? await this.classroomsService.getClassroom(createStudentDto.classroomId || '')
      : undefined;

    if (classroom && classroom.branch?.id !== branch.id) {
      throw new BadRequestException('Student branch must match classroom branch.');
    }

    const student = this.studentRepository.create({
      fullName: createStudentDto.fullName,
      dateOfBirth: createStudentDto.dateOfBirth || undefined,
      gender: createStudentDto.gender || undefined,
      notes: createStudentDto.notes || undefined,
      branch,
      school,
      classroom: classroom || undefined,
    });

    const savedStudent = await this.studentRepository.save(student);

    return plainToInstance(StudentSerializer, savedStudent, {
      excludeExtraneousValues: true,
    });
  }

  async getStudents(
    filters: ListFilterDTO,
    school: School,
    branchId?: string,
  ): Promise<FilterResponse<StudentSerializer>> {
    const searchFields = ['fullName', 'dateOfBirth', 'gender'];

    const where: FindManyOptions<Student>['where'] = {
      school: { pkid: school.pkid },
      ...(branchId ? { branch: { id: branchId } } : {}),
    };

    const options: FindManyOptions<Student> = {
      where,
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

    return this.listFilterService.filter({
      repository: this.studentRepository,
      serializer: StudentSerializer,
      filters,
      searchFields,
      options,
    }) as Promise<FilterResponse<StudentSerializer>>;
  }

  async getStudent(id: string): Promise<Student> {
    const student = await this.studentRepository.findOne({
      where: { id },
      relations: ['branch', 'school', 'classroom', 'guardians', 'guardians.parent'],
    });
    if (!student) throw new NotFoundException(STUDENT_NOT_FOUND);
    return student;
  }

  // ─── Guardian Management ──────────────────────────────────────────────────

  async addGuardian(
    studentId: string,
    dto: AddGuardianDto,
  ): Promise<StudentGuardianSerializer> {
    const student = await this.getStudent(studentId);
    const parent = await this.parentsService.getParent(dto.parentId);

    const existing = await this.studentGuardianRepository.findOne({
      where: { student: { pkid: student.pkid }, parent: { pkid: parent.pkid } },
    });
    if (existing) throw new BadRequestException(GUARDIAN_ALREADY_EXISTS);

    const guardian = this.studentGuardianRepository.create({
      student,
      parent,
      relationship: dto.relationship ?? EGuardianRelationship.OTHER,
      canPickup: dto.canPickup ?? false,
      isEmergencyContact: dto.isEmergencyContact ?? false,
    });

    const saved = await this.studentGuardianRepository.save(guardian);
    return plainToInstance(StudentGuardianSerializer, saved, {
      excludeExtraneousValues: true,
    });
  }

  async getGuardians(studentId: string): Promise<StudentGuardianSerializer[]> {
    const student = await this.getStudent(studentId);

    const guardians = await this.studentGuardianRepository.find({
      where: { student: { pkid: student.pkid } },
      relations: ['parent', 'parent.user'],
    });

    return plainToInstance(StudentGuardianSerializer, guardians, {
      excludeExtraneousValues: true,
    });
  }

  async updateGuardian(
    studentId: string,
    guardianId: string,
    dto: UpdateGuardianDto,
  ): Promise<StudentGuardianSerializer> {
    const student = await this.getStudent(studentId);

    const guardian = await this.studentGuardianRepository.findOne({
      where: { id: guardianId, student: { pkid: student.pkid } },
      relations: ['parent', 'parent.user'],
    });
    if (!guardian) throw new NotFoundException(GUARDIAN_NOT_FOUND);

    if (dto.relationship !== undefined) guardian.relationship = dto.relationship;
    if (dto.canPickup !== undefined) guardian.canPickup = dto.canPickup;
    if (dto.isEmergencyContact !== undefined) guardian.isEmergencyContact = dto.isEmergencyContact;

    const saved = await this.studentGuardianRepository.save(guardian);
    return plainToInstance(StudentGuardianSerializer, saved, {
      excludeExtraneousValues: true,
    });
  }

  async removeGuardian(studentId: string, guardianId: string): Promise<void> {
    const student = await this.getStudent(studentId);

    const guardian = await this.studentGuardianRepository.findOne({
      where: { id: guardianId, student: { pkid: student.pkid } },
    });
    if (!guardian) throw new NotFoundException(GUARDIAN_NOT_FOUND);

    await this.studentGuardianRepository.remove(guardian);
  }
}

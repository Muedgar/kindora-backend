import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from 'src/users/entities';
import { School } from './entities/school.entity';
import { CreateSchoolDto } from './dto/create-school.dto';
import { SchoolBranch } from './entities/rwanda/school-branch.entity';
import { SchoolMember } from './entities/school-member.entity';
import { VillageService } from 'src/location/rwanda/village/village.service';
import { CreateBranchDto } from './dto/create-branch.dto';
import { UpdateBranchDto } from './dto/update-branch.dto';
import { StaffBranch } from 'src/staffs/entities/staff-branch.entity';
import { Classroom } from 'src/classrooms/entities/classroom.entity';
import { Student } from 'src/students/entities/student.entity';
import { Staff } from 'src/staffs/entities/staff.entity';
import { ESchoolMemberStatus } from './enums';
import { SCHOOL_BRANCH_CODE_EXISTS, SCHOOL_BRANCH_NOT_FOUND, SCHOOL_MEMBER_NOT_FOUND, SCHOOL_NOT_FOUND } from './messages';

@Injectable()
export class SchoolService {
  constructor(
    @InjectRepository(School)
    private schoolRepository: Repository<School>,
    @InjectRepository(SchoolBranch)
    private schoolBranchRepository: Repository<SchoolBranch>,
    @InjectRepository(SchoolMember)
    private schoolMemberRepository: Repository<SchoolMember>,
    @InjectRepository(StaffBranch)
    private staffBranchRepository: Repository<StaffBranch>,
    @InjectRepository(Staff)
    private staffRepository: Repository<Staff>,
    @InjectRepository(Classroom)
    private classroomRepository: Repository<Classroom>,
    @InjectRepository(Student)
    private studentRepository: Repository<Student>,
    private villageService: VillageService,
  ) {}
  async create(createSchoolDto: CreateSchoolDto, createdBy: User) {
    const school = this.schoolRepository.create({
      ...createSchoolDto,
      createdBy: createdBy,
    });
    return await this.schoolRepository.save(school);
  }

  /**
   * Returns all SchoolMember records for a given user across every school.
   * Replaces the old single-school `getByUser` lookup which found a school
   * by its `createdBy` FK — not suitable for multi-tenant membership queries.
   */
  async getMembershipsByUser(userId: string): Promise<SchoolMember[]> {
    return this.schoolMemberRepository.find({
      where: { member: { id: userId } },
      relations: ['school'],
      order: { createdAt: 'ASC' },
    });
  }

  async getBranchById(id: string): Promise<SchoolBranch | null> {
    return this.schoolBranchRepository.findOne({
      where: { id },
      relations: ['school'],
    });
  }

  async getUserActiveMemberInSchool(
    userId: string,
    schoolId: string,
  ): Promise<SchoolMember | null> {
    return this.schoolMemberRepository.findOne({
      where: {
        member: { id: userId },
        school: { id: schoolId },
        status: ESchoolMemberStatus.ACTIVE,
      },
      relations: ['school', 'defaultBranch'],
    });
  }

  async getFirstActiveMembershipForUser(
    userId: string,
  ): Promise<SchoolMember | null> {
    const members = await this.schoolMemberRepository.find({
      where: {
        member: { id: userId },
        status: ESchoolMemberStatus.ACTIVE,
      },
      relations: ['school', 'defaultBranch'],
      order: { createdAt: 'ASC' },
      take: 1,
    });
    return members[0] ?? null;
  }

  async getBranchesBySchool(schoolId: string): Promise<SchoolBranch[]> {
    return this.schoolBranchRepository.find({
      where: { school: { id: schoolId } },
      relations: ['rwandaVillage', 'school'],
      order: { name: 'ASC' },
    });
  }

  async createBranch(schoolId: string, dto: CreateBranchDto): Promise<SchoolBranch> {
    const school = await this.schoolRepository.findOne({ where: { id: schoolId } });
    if (!school) throw new BadRequestException(SCHOOL_NOT_FOUND);

    const existing = await this.schoolBranchRepository.findOne({
      where: { school: { id: schoolId }, code: dto.code },
    });
    if (existing) {
      throw new BadRequestException(SCHOOL_BRANCH_CODE_EXISTS);
    }

    const rwandaVillage = await this.villageService.getVillageById(
      dto.rwandaVillageId,
    );

    const branch = this.schoolBranchRepository.create();
    branch.school = school;
    branch.name = dto.name;
    branch.code = dto.code;
    branch.country = dto.country;
    branch.address = dto.address ?? null;
    branch.rwandaVillage = rwandaVillage;
    branch.isMainBranch = dto.isMainBranch ?? false;

    return this.schoolBranchRepository.save(branch);
  }

  async updateBranch(
    schoolId: string,
    branchId: string,
    dto: UpdateBranchDto,
  ): Promise<SchoolBranch> {
    const branch = await this.schoolBranchRepository.findOne({
      where: { id: branchId, school: { id: schoolId } },
      relations: ['school'],
    });
    if (!branch) throw new BadRequestException(SCHOOL_BRANCH_NOT_FOUND);

    if (dto.name !== undefined) branch.name = dto.name;
    if (dto.code !== undefined) branch.code = dto.code;
    if (dto.country !== undefined) branch.country = dto.country;
    if (dto.address !== undefined) branch.address = dto.address;
    if (dto.isMainBranch !== undefined) branch.isMainBranch = dto.isMainBranch;

    // Village is mandatory (non-nullable); only update when a new ID is supplied
    if (dto.rwandaVillageId) {
      branch.rwandaVillage = await this.villageService.getVillageById(
        dto.rwandaVillageId,
      );
    }

    return this.schoolBranchRepository.save(branch);
  }

  async setDefaultBranch(
    userId: string,
    schoolId: string,
    branchId: string,
  ): Promise<SchoolMember> {
    const member = await this.getUserActiveMemberInSchool(userId, schoolId);
    if (!member) throw new ForbiddenException(SCHOOL_MEMBER_NOT_FOUND);

    const branch = await this.schoolBranchRepository.findOne({
      where: { id: branchId, school: { id: schoolId } },
    });
    if (!branch) throw new BadRequestException(SCHOOL_BRANCH_NOT_FOUND);

    member.defaultBranch = branch;
    return this.schoolMemberRepository.save(member);
  }

  async listBranchStaff(branchId: string): Promise<StaffBranch[]> {
    return this.staffBranchRepository.find({
      where: { branch: { id: branchId } },
      relations: ['staff', 'staff.user', 'branch'],
    });

    // todo return paginated data, use common service for pagination.
  }

  async assignStaffToBranch(
    branchId: string,
    staffId: string,
    isPrimary = false,
  ): Promise<StaffBranch> {
    const branch = await this.schoolBranchRepository.findOne({
      where: { id: branchId },
      relations: ['school'],
    });
    if (!branch) throw new BadRequestException('Branch not found');

    const staff = await this.staffRepository.findOne({
      where: { id: staffId },
      relations: ['school'],
    });
    if (!staff) throw new BadRequestException('Staff not found');
    if (staff.school.id !== branch.school.id) {
      throw new BadRequestException('Staff and branch belong to different schools');
    }

    const existing = await this.staffBranchRepository.findOne({
      where: { staff: { id: staff.id }, branch: { id: branch.id } },
    });
    if (existing) return existing;

    const assignment = this.staffBranchRepository.create({
      staff,
      branch,
      isPrimary,
    });
    return this.staffBranchRepository.save(assignment);
  }

  async listBranchClassrooms(branchId: string): Promise<Classroom[]> {
    return this.classroomRepository.find({
      where: { branch: { id: branchId } },
      relations: ['branch', 'createdBy'],
    });
  }

  async listBranchStudents(branchId: string): Promise<Student[]> {
    return this.studentRepository.find({
      where: { branch: { id: branchId } },
      relations: ['branch', 'classroom', 'guardians', 'guardians.parent'],
    });
  }
}

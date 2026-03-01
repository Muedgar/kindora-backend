import { BadRequestException, Injectable } from '@nestjs/common';
import { CreateStaffDto } from './dto/create-staff.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { FindManyOptions, Repository } from 'typeorm';
import { Staff } from './entities/staff.entity';
import { UserService } from 'src/users/users.service';
import { StaffSerializer } from './serializers';
import { plainToInstance } from 'class-transformer';
import { ListFilterDTO } from 'src/common/dtos';
import { FilterResponse } from 'src/common/interfaces';
import { ListFilterService } from 'src/common/services';
import { SchoolService } from 'src/schools/school.service';
import { StaffBranch } from './entities/staff-branch.entity';
import { School } from 'src/schools/entities/school.entity';
import { User } from 'src/users/entities';
import { SCHOOL_BRANCH_NOT_FOUND } from 'src/schools/messages';

@Injectable()
export class StaffsService {
  constructor(
    @InjectRepository(Staff) private staffRepository: Repository<Staff>,
    @InjectRepository(StaffBranch)
    private staffBranchRepository: Repository<StaffBranch>,
    private userService: UserService,
    private schoolService: SchoolService,
    private listFilterService: ListFilterService,
  ) {}

  /**
   * Creates a Staff record atomically.
   * User + SchoolMember + SchoolMemberRole are written by UserService.createUser.
   * The Staff profile is then created and linked to the same school.
   *
   * @param school         Resolved from SchoolContextGuard — no manual lookup.
   * @param requestingUser The authenticated admin creating the staff.
   */
  async create(
    createStaffDto: CreateStaffDto,
    school: School,
    requestingUser: User,
  ): Promise<StaffSerializer> {
    const userDto = {
      firstName: createStaffDto.firstName,
      lastName: createStaffDto.lastName,
      userName: createStaffDto.userName,
      email: createStaffDto.email,
      roleId: createStaffDto.roleId,
      branchIds: createStaffDto.branchIds,
    };

    const createdUser = await this.userService.createUser(
      userDto as Parameters<UserService['createUser']>[0],
      school,
      requestingUser,
    );

    const userFound = await this.userService.getUser(createdUser.id);

    const branchAssignments: StaffBranch[] = [];
    for (const [index, branchId] of createStaffDto.branchIds.entries()) {
      const branch = await this.schoolService.getBranchById(branchId);
      if (!branch) throw new BadRequestException(`${SCHOOL_BRANCH_NOT_FOUND}: ${branchId}`);
      if (branch.school.id !== school.id) {
        throw new BadRequestException(
          `Branch ${branchId} does not belong to your school`,
        );
      }

      branchAssignments.push(
        this.staffBranchRepository.create({
          branch,
          isPrimary: index === 0,
        }),
      );
    }

    const staff = this.staffRepository.create({
      user: userFound,
      position: createStaffDto.position,
      school,
    });

    const savedStaff = await this.staffRepository.save(staff);
    await this.staffBranchRepository.save(
      branchAssignments.map((assignment) => ({
        ...assignment,
        staff: savedStaff,
      })),
    );

    return plainToInstance(StaffSerializer, savedStaff, {
      excludeExtraneousValues: true,
    });
  }

  async getStaffs(
    filters: ListFilterDTO,
    schoolId?: string,
  ): Promise<FilterResponse<StaffSerializer>> {
    const searchFields = ['position'];

    const options: FindManyOptions<Staff> = {
      where: schoolId ? { school: { id: schoolId } } : {},
      relations: ['user', 'school', 'branches', 'branches.branch'],
    };

    return this.listFilterService.filter({
      repository: this.staffRepository,
      serializer: StaffSerializer,
      filters,
      searchFields,
      options,
    }) as Promise<FilterResponse<StaffSerializer>>;
  }
}

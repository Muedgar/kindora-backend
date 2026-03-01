import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import { ListFilterDTO } from 'src/common/dtos';
import { FilterResponse, Mail } from 'src/common/interfaces';
import { ROLE_IS_DEACTIVATED } from 'src/roles/messages';
import { RoleService } from 'src/roles/roles.service';
import { FindManyOptions, Repository } from 'typeorm';
import { CreateUserDTO, RegisterUserDTO, UpdateUserDTO } from './dtos';
import { User } from './entities/user.entity';
import {
  CANNOT_DELETE_SUPER_ADMIN,
  CONTACT_ADMIN,
  EMAIL_EXISTS,
  SCHOOL_ALREADY_EXISTS,
  TWO_FA_ALREADY_DISABLED,
  TWO_FA_ALREADY_ENABLED,
  USER_ALREADY_ACTIVATED,
  USER_ALREADY_DEACTIVATED,
  USER_EXISTS_ALREADY,
  USER_NOT_FOUND,
  USER_NOT_IN_SCHOOL,
} from './messages';
import { UserSerializer } from './serializers';
import { ListFilterService } from 'src/common/services';
import { generateRandomPassword } from 'src/utils';
import { EmailService } from 'src/common/services/';
import { INVITE_EMAIL_JOB, REGISTER_EMAIL_JOB } from 'src/common/constants';
import { plainToInstance } from 'class-transformer';
import { JwtService } from '@nestjs/jwt';
import { JwtPayload } from 'src/auth/interfaces';
import { SchoolService } from 'src/schools/school.service';
import { School } from 'src/schools/entities/school.entity';
import { SchoolMember } from 'src/schools/entities/school-member.entity';
import { VillageService } from 'src/location/rwanda/village/village.service';
import { SchoolBranch } from 'src/schools/entities/rwanda/school-branch.entity';
import { SchoolMemberRole } from 'src/schools/entities/school-member-role.entity';
import { ESchoolMemberStatus } from 'src/schools/enums';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User) private userRepository: Repository<User>,
    @InjectRepository(SchoolMember)
    private schoolMemberRepository: Repository<SchoolMember>,
    @InjectRepository(SchoolMemberRole)
    private schoolMemberRoleRepository: Repository<SchoolMemberRole>,
    private roleService: RoleService,
    private emailService: EmailService,
    private schoolService: SchoolService,
    private villageService: VillageService,
    private jwtService: JwtService,
    private listFilterService: ListFilterService,
  ) {}

  async doesUserEmailExists(email: string): Promise<void> {
    const userWithEmail = await this.userRepository.findOne({
      where: { email },
    });

    if (userWithEmail) {
      throw new ConflictException(EMAIL_EXISTS);
    }
  }

  private async validateRole(roleId: string) {
    const role = await this.roleService.getRole(roleId);
    if (!role.status) {
      throw new BadRequestException(ROLE_IS_DEACTIVATED);
    }
    return role;
  }

  async registerUser(
    registerUserDTO: RegisterUserDTO,
  ): Promise<UserSerializer> {
    await this.doesUserEmailExists(registerUserDTO.email);

    const password = registerUserDTO.password;
    const hashedPassword = await bcrypt.hash(password, 12); // A5 cost factor 12

    const role = await this.roleService.getRoleBySlug('super-admin');
    if (!role) throw new BadRequestException(CONTACT_ADMIN);

    const returnedUser = await this.userRepository.manager.transaction(
      async (tx) => {
        // 1) Create user (identity only — no role or userType on User entity)
        const user = tx.create(User, {
          userName: registerUserDTO.userName,
          firstName: registerUserDTO.firstName,
          lastName: registerUserDTO.lastName,
          email: registerUserDTO.email,
          password: hashedPassword,
          isDefaultPassword: false,
          twoFactorAuthentication: true,
        });

        const savedUser = await tx.save(user);

        // 2) Create school
        const school = tx.create(School, {
          name: registerUserDTO.schoolName,
          countries: [registerUserDTO.schoolCountry],
          phoneNumber: registerUserDTO.schoolPhoneNumber,
          createdBy: savedUser,
        });

        const savedSchool = await tx.save(school);

        // 3) Create school member (uniqueness guard)
        const existingSchoolMember = await tx.findOne(SchoolMember, {
          where: {
            member: { id: savedUser.id },
            school: { id: savedSchool.id },
          },
        });

        if (existingSchoolMember) {
          throw new BadRequestException(USER_EXISTS_ALREADY);
        }

        const savedMember = await tx.save(
          tx.create(SchoolMember, {
            school: savedSchool,
            member: savedUser,
            status: ESchoolMemberStatus.ACTIVE,
            isDefault: true,
          }),
        );

        // Create SchoolMemberRole linking the super-admin to their role.
        await tx.save(
          tx.create(SchoolMemberRole, {
            schoolMember: savedMember,
            role,
          }),
        );

        // 4) Create school branch
        const village = await this.villageService.getVillageById(
          registerUserDTO.villageId,
        );

        const existingLocationsCount = await tx.count(SchoolBranch, {
          where: {
            rwandaVillage: { id: village.id },
            school: { id: savedSchool.id },
          },
        });

        const code = existingLocationsCount + 1;

        const existingSchoolBranch = await tx.findOne(SchoolBranch, {
          where: {
            rwandaVillage: { id: village.id },
            school: { id: savedSchool.id },
            code,
          },
        });

        if (existingSchoolBranch) {
          throw new BadRequestException(SCHOOL_ALREADY_EXISTS);
        }

        await tx.save(
          tx.create(SchoolBranch, {
            name: registerUserDTO.schoolName,
            country: registerUserDTO.schoolCountry,
            rwandaVillage: village,
            school: savedSchool,
            code,
            isMainBranch: true,
          }),
        );

        return savedUser;
      },
    );

    // 5) Send welcome email (after commit)
    // TODO (Phase 7): Replace with invite-token email — no plaintext password.
    const emailData: Mail = {
      to: registerUserDTO.email,
      data: {
        firstName: registerUserDTO.firstName,
        email: registerUserDTO.email,
      },
    };

    await this.emailService.sendEmail(emailData, REGISTER_EMAIL_JOB);

    return plainToInstance(UserSerializer, returnedUser, {
      excludeExtraneousValues: true,
    });
  }

  /**
   * Creates a new user in the given school atomically.
   * Caller must supply the resolved school (from SchoolContextGuard) and the
   * requesting User entity so the membership can record who sent the invite.
   *
   * Rolls back entirely if any step fails — no partial writes.
   */
  async createUser(
    createUserDTO: CreateUserDTO,
    school: School,
    requestingUser: User,
  ): Promise<UserSerializer> {
    await this.doesUserEmailExists(createUserDTO.email);
    const role = await this.validateRole(createUserDTO.roleId);

    const hashedPassword = bcrypt.hashSync(
      generateRandomPassword(10),
      bcrypt.genSaltSync(12), // A5 cost factor 12
    );

    const savedUser = await this.userRepository.manager.transaction(
      async (tx) => {
        // 1) User identity — password is a random unguessable placeholder until
        //    the invite is accepted.  emailVerified stays false until acceptance.
        const user = tx.create(User, {
          userName: createUserDTO.userName,
          firstName: createUserDTO.firstName,
          lastName: createUserDTO.lastName,
          email: createUserDTO.email,
          password: hashedPassword,
          status: true,
          emailVerified: false,
        });

        const createdUser = await tx.save(user);

        // 2) Resolve optional default branch (must belong to the same school)
        let defaultBranch: SchoolBranch | undefined = undefined;

        if (createUserDTO.branchIds?.length) {
          const selectedBranch = await this.schoolService.getBranchById(
            createUserDTO.branchIds[0],
          );
          if (!selectedBranch || selectedBranch.school.id !== school.id) {
            throw new BadRequestException(
              'Invalid branch assignment for selected school.',
            );
          }
          defaultBranch = selectedBranch;
        }

        // 3) School membership — starts as INVITED; transitions to ACTIVE
        //    when the user accepts the invite via POST /auth/accept-invite.
        const membership = tx.create(SchoolMember, {
          member: createdUser,
          school,
          status: ESchoolMemberStatus.INVITED,
          isDefault: true,
          invitedBy: requestingUser,
          defaultBranch,
        });

        const savedMembership = await tx.save(membership);

        // 4) Role assignment
        const membershipRole = tx.create(SchoolMemberRole, {
          schoolMember: savedMembership,
          role,
        });
        await tx.save(membershipRole);

        return createdUser;
      },
    );

    // Generate a 24-hour invite token scoped to the 'invite' purpose.
    const invitePayload: JwtPayload = {
      id: savedUser.id,
      email: savedUser.email,
      purpose: 'invite',
    };
    const inviteToken = this.jwtService.sign(invitePayload, { expiresIn: '24h' });

    const emailData: Mail = {
      to: savedUser.email,
      data: {
        firstName: savedUser.firstName,
        inviteToken,
      },
    };

    await this.emailService.sendEmail(emailData, INVITE_EMAIL_JOB);

    return plainToInstance(UserSerializer, savedUser, {
      excludeExtraneousValues: true,
    });
  }

  async findOne(userId: string): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) throw new BadRequestException(USER_NOT_FOUND);
    return user;
  }

  /**
   * Updates a user's profile fields.
   * The caller must supply the current school ID so the service can verify
   * that the user being updated is a member of that school.
   */
  async updateUser(
    id: string,
    updateUserDTO: UpdateUserDTO,
    schoolId: string,
  ): Promise<UserSerializer> {
    await this.verifyUserInSchool(id, schoolId);

    const user = await this.userRepository.findOne({ where: { id } });

    if (!user) {
      throw new NotFoundException(USER_NOT_FOUND);
    }

    if (updateUserDTO.firstName) user.firstName = updateUserDTO.firstName;
    if (updateUserDTO.lastName) user.lastName = updateUserDTO.lastName;
    if (updateUserDTO.userName) user.userName = updateUserDTO.userName;

    const updatedUser = await this.userRepository.save(user);

    return plainToInstance(UserSerializer, updatedUser, {
      excludeExtraneousValues: true,
    });
  }

  /**
   * Throws ForbiddenException if the target user is not a member of the
   * given school. Used by update/delete to enforce school scoping.
   */
  private async verifyUserInSchool(
    userId: string,
    schoolId: string,
  ): Promise<void> {
    const membership = await this.schoolMemberRepository.findOne({
      where: { member: { id: userId }, school: { id: schoolId } },
    });
    if (!membership) {
      throw new ForbiddenException(USER_NOT_IN_SCHOOL);
    }
  }

  /**
   * Returns a paginated list of users scoped to the given school.
   * Only users who have at least one SchoolMember record in this school
   * will be returned — prevents cross-school data leakage.
   */
  async getUsers(
    filters: ListFilterDTO,
    schoolId: string,
  ): Promise<FilterResponse<UserSerializer>> {
    const searchFields = ['firstName', 'lastName', 'userName', 'email'];
    const options: FindManyOptions<User> = {
      where: { schools: { school: { id: schoolId } } },
    };

    return this.listFilterService.filter({
      repository: this.userRepository,
      serializer: UserSerializer,
      filters,
      searchFields,
      options,
    });
  }

  async getUserByEmail(email: string): Promise<UserSerializer> {
    const user = await this.userRepository.findOne({ where: { email } });
    if (!user) {
      throw new NotFoundException(USER_NOT_FOUND);
    }
    return plainToInstance(UserSerializer, user, {
      excludeExtraneousValues: true,
    });
  }

  async getUser(id: string): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException(USER_NOT_FOUND);
    }
    return user;
  }

  async activateUser(id: string): Promise<UserSerializer> {
    const user = await this.getUser(id);

    if (user.status) {
      throw new BadRequestException(USER_ALREADY_ACTIVATED);
    }

    user.status = true;
    const savedUser = await this.userRepository.save(user);

    return plainToInstance(UserSerializer, savedUser, {
      excludeExtraneousValues: true,
    });
  }

  async deactivateUser(id: string): Promise<UserSerializer> {
    const user = await this.getUser(id);

    if (!user.status) {
      throw new BadRequestException(USER_ALREADY_DEACTIVATED);
    }

    user.status = false;
    const savedUser = await this.userRepository.save(user);

    return plainToInstance(UserSerializer, savedUser, {
      excludeExtraneousValues: true,
    });
  }

  async activate2FA(id: string): Promise<UserSerializer> {
    const user = await this.getUser(id);

    if (user.twoFactorAuthentication) {
      throw new BadRequestException(TWO_FA_ALREADY_ENABLED);
    }

    user.twoFactorAuthentication = true;
    const savedUser = await this.userRepository.save(user);

    return plainToInstance(UserSerializer, savedUser, {
      excludeExtraneousValues: true,
    });
  }

  async deactivate2FA(id: string): Promise<UserSerializer> {
    const user = await this.getUser(id);

    if (!user.twoFactorAuthentication) {
      throw new BadRequestException(TWO_FA_ALREADY_DISABLED);
    }

    user.twoFactorAuthentication = false;
    const savedUser = await this.userRepository.save(user);

    return plainToInstance(UserSerializer, savedUser, {
      excludeExtraneousValues: true,
    });
  }

  /**
   * Deletes a user, with two guards:
   * 1. The user must be a member of the caller's school (school scoping).
   * 2. A user with the 'super-admin' role cannot be deleted via this endpoint.
   *    Super-admin removal requires an elevated flow (Phase 5+).
   */
  async deleteUser(id: string, schoolId: string): Promise<void> {
    const membership = await this.schoolMemberRepository.findOne({
      where: { member: { id }, school: { id: schoolId } },
      relations: ['roles', 'roles.role'],
    });

    if (!membership) throw new ForbiddenException(USER_NOT_IN_SCHOOL);

    const isSuperAdmin = membership.roles.some(
      (smr) => smr.role.slug === 'super-admin',
    );
    if (isSuperAdmin) throw new ForbiddenException(CANNOT_DELETE_SUPER_ADMIN);

    const user = await this.getUser(id);
    await this.userRepository.remove(user);
  }
}

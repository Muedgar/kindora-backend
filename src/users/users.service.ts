/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-return */
import {
  BadRequestException,
  ConflictException,
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
  EMAIL_EXISTS,
  TWO_FA_ALREADY_DISABLED,
  TWO_FA_ALREADY_ENABLED,
  USER_ALREADY_ACTIVATED,
  USER_ALREADY_DEACTIVATED,
  USER_NOT_FOUND,
} from './messages';
import { UserSerializer } from './serializers';
import { ListFilterService } from 'src/common/services';
import { generateRandomPassword } from 'src/utils';
import { UserType } from './enums';
import { EmailService } from 'src/common/services/';
import { REGISTER_EMAIL_JOB } from 'src/common/constants';
import { plainToInstance } from 'class-transformer';
import { SchoolService } from 'src/schools/school.service';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User) private userRepository: Repository<User>,
    private roleService: RoleService,
    private emailService: EmailService,
    private schoolService: SchoolService,
  ) {}

  async doesUserEmailExists(email: string) {
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
    const hashedPassword = bcrypt.hashSync(password, bcrypt.genSaltSync(10));

    const role = await this.roleService.getRoleBySlug('super-admin');

    if (!role) {
      throw new BadRequestException('Contact Admin');
    }

    const user = this.userRepository.create({
      userName: registerUserDTO.userName,
      email: registerUserDTO.email,
      password: hashedPassword,
      role,
      userType: UserType.ADMIN,
    });

    const savedUser = await this.userRepository.save(user);

    const schoolDto = {
      name: registerUserDTO.name,
      address: registerUserDTO.address,
      city: registerUserDTO.city,
      country: registerUserDTO.country,
      phoneNumber: registerUserDTO.phoneNumber,
      enrollmentCapacity: registerUserDTO.enrollmentCapacity,
    };
    const school = await this.schoolService.create(schoolDto, savedUser);
    // update user school
    savedUser.school = school;
    // save user again
    const finalUser = await this.userRepository.save(savedUser);
    // send email
    const emailData: Mail = {
      to: finalUser.email,
      data: {
        firstName: finalUser.userName,
        email: finalUser.email,
        password,
      },
    };

    await this.emailService.sendEmail(emailData, REGISTER_EMAIL_JOB);

    return plainToInstance(UserSerializer, savedUser, {
      excludeExtraneousValues: true,
    });
  }

  async createUser(
    createUserDTO: CreateUserDTO,
    requestUser: string,
  ): Promise<UserSerializer> {
    await this.doesUserEmailExists(createUserDTO.email);
    const password = generateRandomPassword(10);
    const hashedPassword = bcrypt.hashSync(password, bcrypt.genSaltSync(10));

    const role = await this.validateRole(createUserDTO.role);

    const userRequesting = await this.userRepository.findOne({
      where: {
        id: requestUser,
      },
    });

    if (!userRequesting) throw new BadRequestException(USER_NOT_FOUND);

    const school = await this.schoolService.getByUser(requestUser);

    if (!school) throw new BadRequestException('School not found');

    const user = this.userRepository.create({
      userName: createUserDTO.userName,
      email: createUserDTO.email,
      password: hashedPassword,
      role,
      school: school,
      userType: createUserDTO.userType,
    });

    const savedUser = await this.userRepository.save(user);
    // send email
    // send email
    const emailData: Mail = {
      to: savedUser.email,
      data: {
        firstName: savedUser.userName,
        email: savedUser.email,
        password,
      },
    };

    await this.emailService.sendEmail(emailData, REGISTER_EMAIL_JOB);

    return plainToInstance(UserSerializer, savedUser, {
      excludeExtraneousValues: true,
    });
  }

  async updateUser(
    id: string,
    updateUserDTO: UpdateUserDTO,
  ): Promise<UserSerializer> {
    const user = await this.userRepository.findOne({
      where: { id },
      relations: ['role', 'school'],
    });

    if (!user) {
      throw new NotFoundException(USER_NOT_FOUND);
    }

    if (updateUserDTO.userName) {
      user.userName = updateUserDTO.userName;
    }

    if (updateUserDTO.userType) {
      user.userType = updateUserDTO.userType;
    }

    if (updateUserDTO.role) {
      const role = await this.validateRole(updateUserDTO.role);
      user.role = role;
    }

    const updatedUser = await this.userRepository.save(user);
    return plainToInstance(UserSerializer, updatedUser, {
      excludeExtraneousValues: true,
    });
  }

  async getUsers(
    filters: ListFilterDTO,
  ): Promise<FilterResponse<UserSerializer>> {
    const listFilterService = new ListFilterService(
      this.userRepository,
      UserSerializer,
    );
    const searchFields = ['userName', 'email'];

    const options: FindManyOptions<User> = {
      relations: ['role', 'role.permissions'],
    };

    return listFilterService.filter({ filters, searchFields, options });
  }

  async getUserByEmail(email: string): Promise<UserSerializer> {
    const user = await this.userRepository.findOne({
      where: { email },
      relations: ['role', 'role.permissions', 'school'],
    });
    if (!user) {
      throw new NotFoundException(USER_NOT_FOUND);
    }
    return plainToInstance(UserSerializer, user, {
      excludeExtraneousValues: true,
    });
  }

  async getUser(id: string): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id },
      relations: ['role', 'school'],
    });

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

  async changePassword(
    id: string,
    newPassword: string,
  ): Promise<UserSerializer> {
    const user = await this.getUser(id);
    const hashedPassword = bcrypt.hashSync(newPassword, bcrypt.genSaltSync(10));
    user.password = hashedPassword;

    const savedUser = await this.userRepository.save(user);
    return new UserSerializer(savedUser);
  }

  async deleteUser(id: string): Promise<void> {
    const user = await this.getUser(id);

    if (user.userType === UserType.ADMIN) {
      throw new BadRequestException('You can not delete a system user.');
    }

    await this.userRepository.remove(user);
  }
}

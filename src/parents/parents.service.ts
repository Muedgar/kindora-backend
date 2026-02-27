import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindManyOptions, Repository } from 'typeorm';
import { UserService } from 'src/users/users.service';
import { plainToInstance } from 'class-transformer';
import { ListFilterDTO } from 'src/common/dtos';
import { FilterResponse } from 'src/common/interfaces';
import { ListFilterService } from 'src/common/services';
import { Parent } from './entities/parent.entity';
import { CreateParentDto } from './dto/create-parent.dto';
import { ParentSerializer } from './serializers';
import { PARENT_NOT_FOUND } from './messages';
import { School } from 'src/schools/entities/school.entity';
import { User } from 'src/users/entities';

@Injectable()
export class ParentsService {
  constructor(
    @InjectRepository(Parent) private parentRepository: Repository<Parent>,
    private userService: UserService,
  ) {}

  /**
   * Creates a Parent record by first creating the underlying User + SchoolMember
   * + SchoolMemberRole atomically (via UserService.createUser), then creating
   * the Parent profile linked to that user.
   *
   * @param school         Resolved from SchoolContextGuard — no manual lookup.
   * @param requestingUser The authenticated admin creating the parent.
   */
  async create(
    createParentDto: CreateParentDto,
    school: School,
    requestingUser: User,
  ): Promise<ParentSerializer> {
    const userDto = {
      firstName: createParentDto.firstName,
      lastName: createParentDto.lastName,
      userName: createParentDto.userName,
      email: createParentDto.email,
      roleId: createParentDto.roleId,
    };

    const createdUser = await this.userService.createUser(
      userDto as Parameters<UserService['createUser']>[0],
      school,
      requestingUser,
    );

    const userFound = await this.userService.getUser(createdUser.id);

    const parent = this.parentRepository.create({
      user: userFound,
      school,
      occupation: createParentDto.occupation,
      phoneNumber: createParentDto.phoneNumber,
      address: createParentDto.address,
    });

    const savedParent = await this.parentRepository.save(parent);

    return plainToInstance(ParentSerializer, savedParent, {
      excludeExtraneousValues: true,
    });
  }

  async getParents(
    filters: ListFilterDTO,
    schoolId?: string,
  ): Promise<FilterResponse<ParentSerializer>> {
    const listFilterService = new ListFilterService(
      this.parentRepository,
      ParentSerializer,
    );
    const searchFields = ['occupation', 'phoneNumber', 'address'];

    const options: FindManyOptions<Parent> = {
      where: schoolId ? { school: { id: schoolId } } : {},
      relations: ['user'],
    };

    return listFilterService.filter({
      filters,
      searchFields,
      options,
    }) as Promise<FilterResponse<ParentSerializer>>;
  }

  async getParent(id: string): Promise<Parent> {
    const parent = await this.parentRepository.findOne({
      where: { id },
      relations: ['user', 'guardianships', 'guardianships.student'],
    });

    if (!parent) {
      throw new BadRequestException(PARENT_NOT_FOUND);
    }

    return parent;
  }
}

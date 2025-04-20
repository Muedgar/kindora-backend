import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindManyOptions, Repository } from 'typeorm';
import { UserService } from 'src/users/users.service';
import { UserType } from 'src/users/enums';
import { plainToInstance } from 'class-transformer';
import { ListFilterDTO } from 'src/common/dtos';
import { FilterResponse } from 'src/common/interfaces';
import { ListFilterService } from 'src/common/services';
import { Parent } from './entities/parent.entity';
import { CreateParentDto } from './dto/create-parent.dto';
import { ParentSerializer } from './serializers';
import { PARENT_NOT_FOUND } from './messages';

@Injectable()
export class ParentsService {
  constructor(
    @InjectRepository(Parent) private parentRepository: Repository<Parent>,
    private userService: UserService,
  ) {}

  async create(
    createParentDto: CreateParentDto,
    requestUser: string,
  ): Promise<ParentSerializer> {
    const userDto = {
      userName: createParentDto.userName,
      email: createParentDto.email,
      userType: UserType.PARENT,
      role: createParentDto.role,
    };

    const user = await this.userService.createUser(userDto, requestUser);
    const userFound = await this.userService.getUser(user.id);
    const parent = this.parentRepository.create({
      user: userFound,
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
  ): Promise<FilterResponse<ParentSerializer>> {
    const listFilterService = new ListFilterService(
      this.parentRepository,
      ParentSerializer,
    );
    const searchFields = ['occupation', 'phoneNumber', 'address'];

    const options: FindManyOptions<Parent> = {
      relations: ['user', 'children'],
    };

    return listFilterService.filter({
      filters,
      searchFields,
      options,
    }) as Promise<FilterResponse<ParentSerializer>>;
  }

  async getParent(id: string): Promise<Parent> {
    const parent = await this.parentRepository.findOne({
      where: {
        id,
      },
      relations: ['user', 'children'],
    });

    if (!parent) {
      throw new BadRequestException(PARENT_NOT_FOUND);
    }

    return parent;
  }
}

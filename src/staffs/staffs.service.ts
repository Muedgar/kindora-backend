import { Injectable } from '@nestjs/common';
import { CreateStaffDto } from './dto/create-staff.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { FindManyOptions, Repository } from 'typeorm';
import { Staff } from './entities/staff.entity';
import { UserService } from 'src/users/users.service';
import { UserType } from 'src/users/enums';
import { StaffSerializer } from './serializers';
import { plainToInstance } from 'class-transformer';
import { ListFilterDTO } from 'src/common/dtos';
import { FilterResponse } from 'src/common/interfaces';
import { ListFilterService } from 'src/common/services';

@Injectable()
export class StaffsService {
  constructor(
    @InjectRepository(Staff) private staffRepository: Repository<Staff>,
    private userService: UserService,
  ) {}

  async create(
    createStaffDto: CreateStaffDto,
    requestUser: string,
  ): Promise<StaffSerializer> {
    const userDto = {
      userName: createStaffDto.userName,
      email: createStaffDto.email,
      userType: UserType.STAFF,
      role: createStaffDto.role,
    };

    const user = await this.userService.createUser(userDto, requestUser);
    const userFound = await this.userService.getUser(user.id);
    const staff = this.staffRepository.create({
      user: userFound,
      position: createStaffDto.position,
    });
    const savedStaff = await this.staffRepository.save(staff);
    return plainToInstance(StaffSerializer, savedStaff, {
      excludeExtraneousValues: true,
    });
  }

  async getStaffs(
    filters: ListFilterDTO,
  ): Promise<FilterResponse<StaffSerializer>> {
    const listFilterService = new ListFilterService(
      this.staffRepository,
      StaffSerializer,
    );
    const searchFields = ['position'];

    const options: FindManyOptions<Staff> = {
      relations: ['user'],
    };

    return listFilterService.filter({
      filters,
      searchFields,
      options,
    }) as Promise<FilterResponse<StaffSerializer>>;
  }
}

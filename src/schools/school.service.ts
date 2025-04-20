import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from 'src/users/entities';
import { School } from './entities/school.entity';
import { CreateSchoolDto } from './dto/create-school.dto';

@Injectable()
export class SchoolService {
  constructor(
    @InjectRepository(School)
    private schoolRepository: Repository<School>,
  ) {}
  async create(createSchoolDto: CreateSchoolDto, createdBy: User) {
    const school = this.schoolRepository.create({
      ...createSchoolDto,
      createdBy: createdBy,
    });
    return await this.schoolRepository.save(school);
  }

  async getByUser(id: string) {
    const school = await this.schoolRepository.findOne({
      where: {
        createdBy: {
          id,
        },
      },
    });

    return school;
  }
}

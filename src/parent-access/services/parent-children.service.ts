import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Parent } from 'src/parents/entities/parent.entity';
import { School } from 'src/schools/entities/school.entity';
import { User } from 'src/users/entities';
import { Repository } from 'typeorm';

@Injectable()
export class ParentChildrenService {
  constructor(
    @InjectRepository(Parent)
    private readonly parentRepository: Repository<Parent>,
  ) {}

  async getChildren(school: School, user: User) {
    const parent = await this.parentRepository.findOne({
      where: {
        user: { pkid: user.pkid },
        school: { pkid: school.pkid },
      },
      relations: ['guardianships', 'guardianships.student', 'guardianships.student.classroom'],
    });

    if (!parent) return [];

    return parent.guardianships.map((g) => ({
      studentId: g.student.id,
      fullName: g.student.fullName,
      classroomName: g.student.classroom?.name ?? null,
      profilePhotoUrl: null,
    }));
  }
}

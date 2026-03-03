import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Parent } from 'src/parents/entities/parent.entity';
import { StudentGuardian } from 'src/students/entities/student-guardian.entity';
import { User } from 'src/users/entities';
import { Repository } from 'typeorm';
import { AUTHENTICATION_REQUIRED, SCHOOL_CONTEXT_REQUIRED } from '../messages';
import { SchoolContext } from '../interfaces/school-context.interface';

/**
 * ParentGuard
 *
 * Ensures the caller is a parent in the selected school and, when a `studentId`
 * path param is present, that the parent is a guardian of that student.
 */
@Injectable()
export class ParentGuard implements CanActivate {
  constructor(
    @InjectRepository(Parent)
    private readonly parentRepository: Repository<Parent>,
    @InjectRepository(StudentGuardian)
    private readonly guardianRepository: Repository<StudentGuardian>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<{
      user?: User;
      params?: Record<string, string | undefined>;
      schoolContext?: SchoolContext;
    }>();

    const user = request.user;
    if (!user) throw new ForbiddenException(AUTHENTICATION_REQUIRED);

    const schoolContext = request.schoolContext;
    if (!schoolContext) throw new BadRequestException(SCHOOL_CONTEXT_REQUIRED);

    const parent = await this.parentRepository.findOne({
      where: {
        user: { pkid: user.pkid },
        school: { pkid: schoolContext.school.pkid },
      },
    });

    if (!parent) {
      throw new ForbiddenException(
        'Parent profile not found in the selected school.',
      );
    }

    const studentId = request.params?.studentId;
    if (!studentId) return true;

    const guardianship = await this.guardianRepository.findOne({
      where: {
        parent: { pkid: parent.pkid },
        student: {
          id: studentId,
          school: { pkid: schoolContext.school.pkid },
        },
      },
    });

    if (!guardianship) {
      throw new ForbiddenException(
        'You do not have access to this student in the selected school.',
      );
    }

    return true;
  }
}

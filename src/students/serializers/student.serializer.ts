import { Exclude, Expose, Transform, Type } from 'class-transformer';
import { ClassroomSerializer } from 'src/classrooms/serializers';
import { BaseSerializer } from 'src/common/serializers';
import { StudentGuardianSerializer } from './student-guardian.serializer';

export class StudentSerializer extends BaseSerializer {
  @Expose()
  fullName: string;

  @Expose()
  dateOfBirth: string;

  @Expose()
  gender: string;

  @Expose()
  notes: string;

  /** ID of the school this student belongs to. */
  @Expose()
  @Transform(({ obj }) => obj.school?.id)
  schoolId: string;

  @Expose()
  @Type(() => StudentGuardianSerializer)
  guardians: StudentGuardianSerializer[];

  @Expose()
  @Type(() => ClassroomSerializer)
  classroom: ClassroomSerializer;

  @Exclude()
  version: number;
}

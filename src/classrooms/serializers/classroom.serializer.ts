import { Exclude, Expose, Transform, Type } from 'class-transformer';
import { BaseSerializer } from 'src/common/serializers';
import { StudentSerializer } from 'src/students/serializers';

export class ClassroomSerializer extends BaseSerializer {
  @Expose()
  name: string;

  @Expose()
  ageGroup: string;

  @Expose()
  capacity: string;

  /** ID of the school this classroom belongs to. */
  @Expose()
  @Transform(({ obj }) => obj.school?.id)
  schoolId: string;

  /** ID of the user who created this classroom. */
  @Expose()
  @Transform(({ obj }) => obj.createdBy?.id)
  createdById: string;

  /** Number of enrolled students. */
  @Expose()
  @Transform(({ obj }) => obj.students?.length ?? 0)
  studentCount: number;

  @Expose()
  @Type(() => StudentSerializer)
  students: StudentSerializer[];

  @Exclude()
  version: number;
}

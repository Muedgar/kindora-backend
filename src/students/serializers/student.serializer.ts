import { Exclude, Expose, Type } from 'class-transformer';
import { ClassroomSerializer } from 'src/classrooms/serializers';
import { BaseSerializer } from 'src/common/serializers';
import { ParentSerializer } from 'src/parents/serializers';

export class StudentSerializer extends BaseSerializer {
  @Expose()
  fullName: string;

  @Expose()
  dateOfBirth: string;

  @Expose()
  gender: string;

  @Expose()
  notes: string;

  @Expose()
  @Type(() => ParentSerializer)
  parent: ParentSerializer;

  @Expose()
  @Type(() => ClassroomSerializer)
  classroom: ClassroomSerializer;

  @Exclude()
  version: number;
}

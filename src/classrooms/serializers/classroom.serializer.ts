import { Exclude, Expose, Type } from 'class-transformer';
import { BaseSerializer } from 'src/common/serializers';
import { StudentSerializer } from 'src/students/serializers';
import { UserSerializer } from 'src/users/serializers';

export class ClassroomSerializer extends BaseSerializer {
  @Expose()
  name: string;

  @Expose()
  ageGroup: string;

  @Expose()
  capacity: string;

  @Expose()
  @Type(() => UserSerializer)
  createdBy: UserSerializer;

  @Expose()
  @Type(() => StudentSerializer)
  students: StudentSerializer;

  @Exclude()
  version: number;
}

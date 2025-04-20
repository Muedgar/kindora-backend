import { Exclude, Expose, Type } from 'class-transformer';
import { BaseSerializer } from 'src/common/serializers';
import { StudentSerializer } from 'src/students/serializers';
import { UserSerializer } from 'src/users/serializers';

export class ParentSerializer extends BaseSerializer {
  @Expose()
  occupation: string;

  @Expose()
  phoneNumber: string;

  @Expose()
  address: string;

  @Expose()
  @Type(() => UserSerializer)
  user: UserSerializer;

  @Expose()
  @Type(() => StudentSerializer)
  children: StudentSerializer;

  @Exclude()
  version: number;
}

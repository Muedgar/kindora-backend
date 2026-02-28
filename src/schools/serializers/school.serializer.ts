import { Expose } from 'class-transformer';
import { BaseSerializer } from 'src/common/serializers';
import { ECountry } from '../enums';

export class SchoolSerializer extends BaseSerializer {
  @Expose()
  name: string;

  @Expose()
  countries: ECountry[];

  @Expose()
  phoneNumber: string;

  @Expose()
  enrollmentCapacity: string;
}

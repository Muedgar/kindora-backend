import { Expose } from 'class-transformer';

export class SchoolSerializer {
  @Expose()
  id: string;

  @Expose()
  name: string;

  @Expose()
  address: string;

  @Expose()
  city: string;

  @Expose()
  country: string;

  @Expose()
  phoneNumber: string;

  @Expose()
  enrollmentCapacity: string;
}

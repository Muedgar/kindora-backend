import { AppBaseEntity } from 'src/common/entities';
import { Column, Entity, JoinColumn, ManyToOne, Unique } from 'typeorm';
import { User } from 'src/users/entities';
import { School } from '../school.entity';
import { Village } from 'src/location/rwanda/village/village.entity';

@Entity('school_location_rwanda')
@Unique(['school', 'village', 'code'])
export class SchoolLocation extends AppBaseEntity {
  @Column({ type: 'int', nullable: false })
  code: number;

  @ManyToOne(() => Village, (village) => village.pkid, {
    nullable: false,
  })
  @JoinColumn({ name: 'village_id' })
  village: Village;

  @ManyToOne(() => School, (school) => school.pkid, { nullable: false })
  @JoinColumn({ name: 'school_id' })
  school: School;
}

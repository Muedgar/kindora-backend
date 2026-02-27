import { AppBaseEntity } from 'src/common/entities';
import { Column, Entity, JoinColumn, ManyToOne, Unique } from 'typeorm';
import { School } from '../school.entity';
import { Village } from 'src/location/rwanda/village/village.entity';
import { ECountry } from 'src/schools/enums';

@Entity('school_branches')
@Unique(['school', 'code'])
export class SchoolBranch extends AppBaseEntity {
  @Column({ type: 'varchar', length: 200, nullable: false })
  name: string;

  @Column({ type: 'int', nullable: false })
  code: number;

  @Column({
    type: 'enum',
    enum: ECountry,
    nullable: false,
    default: ECountry.RWANDA,
  })
  country: ECountry;

  @Column({ type: 'text', nullable: true })
  address: string | null;

  @Column({ type: 'boolean', nullable: false, default: false })
  isMainBranch: boolean;

  /**
   * Mandatory Rwanda village anchor.
   * Every branch must be located in a specific village.
   * When Uganda is added, a separate SchoolBranchUganda entity will reference
   * Uganda's own location hierarchy — no nullable FK columns here.
   */
  @ManyToOne(() => Village, (village) => village.branches, {
    nullable: false,
  })
  @JoinColumn({ name: 'rwanda_village_id' })
  rwandaVillage: Village;

  @ManyToOne(() => School, (school) => school.branches, { nullable: false })
  @JoinColumn({ name: 'school_id' })
  school: School;
}

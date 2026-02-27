import { AppBaseEntity } from 'src/common/entities';
import { SchoolBranch } from 'src/schools/entities/rwanda/school-branch.entity';
import { Column, Entity, ManyToOne, Unique } from 'typeorm';
import { Staff } from './staff.entity';

@Entity('staff_branches')
@Unique(['staff', 'branch'])
export class StaffBranch extends AppBaseEntity {
  @ManyToOne(() => Staff, (staff) => staff.branches, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  staff: Staff;

  @ManyToOne(() => SchoolBranch, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  branch: SchoolBranch;

  @Column({ type: 'boolean', nullable: false, default: false })
  isPrimary: boolean;

  @Column({ type: 'date', nullable: true })
  startDate: Date;

  @Column({ type: 'date', nullable: true })
  endDate: Date;
}

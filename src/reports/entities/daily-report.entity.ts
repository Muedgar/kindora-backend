import { AppBaseEntity } from 'src/common/entities';
import { Column, Entity, ManyToOne } from 'typeorm';
import { Activity } from './activity.entity';
import { Staff } from 'src/staffs/entities/staff.entity';
import { Student } from 'src/students/entities/student.entity';
import { GradingLevel } from './grading-level.entity';
import { Unique } from 'typeorm';

@Entity('daily_report')
@Unique(['student', 'activity', 'gradingLevel', 'date'])
export class DailyReport extends AppBaseEntity {
  @Column({ type: 'date' })
  date: Date;

  @Column({ type: 'varchar', length: 500, nullable: true })
  comments: string;

  @ManyToOne(() => Activity, { nullable: false })
  activity: Activity;

  @ManyToOne(() => GradingLevel, { nullable: false })
  gradingLevel: GradingLevel;

  @ManyToOne(() => Student, { nullable: false })
  student: Student;

  @ManyToOne(() => Staff, { nullable: false })
  createdBy: Staff;

  @ManyToOne(() => Staff, { nullable: true })
  updatedBy: Staff;
}

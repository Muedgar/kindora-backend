// staff.entity.ts
import { Column, Entity, JoinColumn, OneToOne } from 'typeorm';
import { AppBaseEntity } from 'src/common/entities';
import { User } from 'src/users/entities/user.entity';

@Entity('staffs')
export class Staff extends AppBaseEntity {
  @OneToOne(() => User, { nullable: false, cascade: true })
  @JoinColumn()
  user: User;

  @Column({ type: 'varchar', length: 100, nullable: true })
  position: string;
}

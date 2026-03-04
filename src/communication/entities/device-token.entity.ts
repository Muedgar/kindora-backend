import { AppBaseEntity } from 'src/common/entities';
import { School } from 'src/schools/entities/school.entity';
import { User } from 'src/users/entities';
import { Column, Entity, JoinColumn, ManyToOne, Unique } from 'typeorm';

export type DevicePlatform = 'ios' | 'android';

@Entity('device_tokens')
@Unique('UQ_device_tokens_user_school_token', ['user', 'school', 'token'])
export class DeviceToken extends AppBaseEntity {
  @ManyToOne(() => School, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'school_id' })
  school: School | null;

  @ManyToOne(() => User, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'varchar', length: 20, nullable: false })
  platform: DevicePlatform;

  @Column({ type: 'varchar', length: 30, nullable: false, default: 'fcm' })
  provider: string;

  @Column({ type: 'varchar', length: 1024, nullable: false })
  token: string;
}

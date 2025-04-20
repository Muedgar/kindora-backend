import { AppBaseEntity } from 'src/common/entities';
import { Column, Entity } from 'typeorm';

@Entity('permissions')
export class Permission extends AppBaseEntity {
  @Column({ type: 'varchar', length: 100, nullable: false, unique: true })
  name: string;

  @Column({ type: 'varchar', length: 100, nullable: false, unique: true })
  slug: string;

  @Column({ type: 'boolean', nullable: false, default: true })
  status: boolean;
}

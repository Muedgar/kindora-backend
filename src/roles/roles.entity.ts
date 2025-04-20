import { AppBaseEntity } from 'src/common/entities';
import { Column, Entity, JoinTable, ManyToMany } from 'typeorm';
import { Permission } from 'src/permissions/entities/permission.entity';

@Entity('roles')
export class Role extends AppBaseEntity {
  @Column({ type: 'varchar', length: 100, nullable: false, unique: true })
  name: string;

  @Column({ type: 'varchar', length: 100, nullable: false, unique: true })
  slug: string;

  @Column({ type: 'boolean', nullable: false, default: true })
  status: boolean;

  @ManyToMany(() => Permission, { onDelete: 'CASCADE' })
  @JoinTable({ name: 'role_permissions' })
  permissions: Permission[];
}

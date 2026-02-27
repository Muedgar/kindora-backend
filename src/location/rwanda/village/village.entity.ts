import { AppBaseEntity } from 'src/common/entities';
import { Cell } from 'src/location/rwanda/cell/cell.entity';
import { SchoolBranch } from 'src/schools/entities/rwanda/school-branch.entity';
import { Column, Entity, Index, ManyToOne, OneToMany } from 'typeorm';

@Entity('villages')
export class Village extends AppBaseEntity {
  @Column({ type: 'varchar', length: 100, nullable: false })
  name: string;

  @ManyToOne(() => Cell, (cell) => cell.pkid)
  @Index()
  cell: Cell;

  @OneToMany(() => SchoolBranch, (schoolBranch) => schoolBranch.rwandaVillage)
  branches: SchoolBranch[];
}

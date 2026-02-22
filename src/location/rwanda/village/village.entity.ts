import { AppBaseEntity } from 'src/common/entities';
import { Cell } from 'src/location/rwanda/cell/cell.entity';
import { SchoolLocation } from 'src/schools/entities/rwanda/school-location.entity';
import { Column, Entity, Index, ManyToOne, OneToMany } from 'typeorm';

@Entity('villages')
export class Village extends AppBaseEntity {
  @Column({ type: 'varchar', length: 100, nullable: false })
  name: string;

  @ManyToOne(() => Cell, (cell) => cell.pkid)
  @Index()
  cell: Cell;

  @OneToMany(() => SchoolLocation, (schoolLocation) => schoolLocation.village)
  schools: SchoolLocation[];
}

import { AppBaseEntity } from 'src/common/entities';
import { Sector } from 'src/location/rwanda/sector/sector.entity';
import { Column, Entity, Index, ManyToOne } from 'typeorm';

@Entity('cells')
export class Cell extends AppBaseEntity {
  @Column({ type: 'varchar', length: 100, nullable: false })
  name: string;

  @ManyToOne(() => Sector, (sector) => sector.pkid)
  @Index()
  sector: Sector;

  protected getFormattedId(): string {
    return this.pkid?.toString().padStart(8, '0') || '';
  }
}

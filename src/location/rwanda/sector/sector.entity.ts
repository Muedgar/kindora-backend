import { AppBaseEntity } from 'src/common/entities';
import { District } from 'src/location/rwanda/district/district.entity';
import { Column, Entity, ManyToOne } from 'typeorm';

@Entity('sectors')
export class Sector extends AppBaseEntity {
  @Column({ type: 'varchar', length: 100, nullable: false })
  name: string;

  @ManyToOne(() => District, (district) => district.pkid)
  district: District;

  protected getFormattedId(): string {
    return this.pkid?.toString().padStart(6, '0') || '';
  }
}

import { AppBaseEntity } from 'src/common/entities';
import { Province } from 'src/location/rwanda/province/province.entity';
import { Column, Entity, ManyToOne } from 'typeorm';

@Entity('districts')
export class District extends AppBaseEntity {
  @Column({ type: 'varchar', length: 100, nullable: false, unique: true })
  name: string;

  @ManyToOne(() => Province, (province) => province.pkid)
  province: Province;

  protected getFormattedId(): string {
    return this.pkid?.toString().padStart(4, '0') || '';
  }
}

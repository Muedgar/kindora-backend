import { AppBaseEntity } from 'src/common/entities';
import { Column, Entity } from 'typeorm';

@Entity('provinces')
export class Province extends AppBaseEntity {
  @Column({ type: 'varchar', length: 100, nullable: false, unique: true })
  name: string;

  protected getFormattedId(): string {
    return this.pkid?.toString().padStart(2, '0') || '';
  }
}

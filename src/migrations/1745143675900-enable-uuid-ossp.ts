import { MigrationInterface, QueryRunner } from 'typeorm';

export class EnableUuidOssp1745143675900 implements MigrationInterface {
  name = 'EnableUuidOssp1745143675900';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP EXTENSION IF EXISTS "uuid-ossp"`);
  }
}

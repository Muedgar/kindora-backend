import { MigrationInterface, QueryRunner } from 'typeorm';

export class AlterGradeLevel1756637076434 implements MigrationInterface {
  name = 'AlterGradeLevel1756637076434';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "grading_level" ADD "description" character varying(100)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "grading_level" DROP COLUMN "description"`,
    );
  }
}

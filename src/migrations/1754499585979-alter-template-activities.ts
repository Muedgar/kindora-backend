import { MigrationInterface, QueryRunner } from 'typeorm';

export class Migrations1754499585979 implements MigrationInterface {
  name = 'Migrations1754499585979';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "report_record" DROP CONSTRAINT "FK_0a53398175138e40d2565051c35"`,
    );
    await queryRunner.query(
      `ALTER TABLE "report_record" ADD "studentPkid" integer NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "report_record" ADD "updatedByPkid" integer`,
    );
    await queryRunner.query(
      `ALTER TABLE "activities" DROP COLUMN "description"`,
    );
    await queryRunner.query(
      `ALTER TABLE "activities" ADD "description" character varying(500)`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."report_record_gradinglevel_enum" RENAME TO "report_record_gradinglevel_enum_old"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."report_record_gradinglevel_enum" AS ENUM('0', '1', '2', '3', '4', '5', '6', '7', '8', '9')`,
    );
    await queryRunner.query(
      `ALTER TABLE "report_record" ALTER COLUMN "gradingLevel" TYPE "public"."report_record_gradinglevel_enum" USING "gradingLevel"::"text"::"public"."report_record_gradinglevel_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."report_record_gradinglevel_enum_old"`,
    );
    await queryRunner.query(
      `ALTER TABLE "template_activities" DROP CONSTRAINT "PK_9abeab7b593b4978fee25d26e2b"`,
    );
    await queryRunner.query(
      `ALTER TABLE "template_activities" ADD CONSTRAINT "PK_af3acdead7887ff78890283c665" PRIMARY KEY ("activity_id")`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_9bf764141c44e498a49c3512ae"`,
    );
    await queryRunner.query(
      `ALTER TABLE "template_activities" DROP COLUMN "template_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "template_activities" ADD "template_id" character varying NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "template_activities" DROP CONSTRAINT "PK_af3acdead7887ff78890283c665"`,
    );
    await queryRunner.query(
      `ALTER TABLE "template_activities" ADD CONSTRAINT "PK_9abeab7b593b4978fee25d26e2b" PRIMARY KEY ("activity_id", "template_id")`,
    );
    await queryRunner.query(
      `ALTER TABLE "template_activities" DROP CONSTRAINT "PK_9abeab7b593b4978fee25d26e2b"`,
    );
    await queryRunner.query(
      `ALTER TABLE "template_activities" ADD CONSTRAINT "PK_9bf764141c44e498a49c3512ae0" PRIMARY KEY ("template_id")`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_af3acdead7887ff78890283c66"`,
    );
    await queryRunner.query(
      `ALTER TABLE "template_activities" DROP COLUMN "activity_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "template_activities" ADD "activity_id" character varying NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "template_activities" DROP CONSTRAINT "PK_9bf764141c44e498a49c3512ae0"`,
    );
    await queryRunner.query(
      `ALTER TABLE "template_activities" ADD CONSTRAINT "PK_9abeab7b593b4978fee25d26e2b" PRIMARY KEY ("template_id", "activity_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_9bf764141c44e498a49c3512ae" ON "template_activities" ("template_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_af3acdead7887ff78890283c66" ON "template_activities" ("activity_id") `,
    );
    await queryRunner.query(
      `ALTER TABLE "report_record" ADD CONSTRAINT "FK_ea20f276e8e6c851110acaa709f" FOREIGN KEY ("studentPkid") REFERENCES "students"("pkid") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "report_record" ADD CONSTRAINT "FK_0a53398175138e40d2565051c35" FOREIGN KEY ("createdByPkid") REFERENCES "staffs"("pkid") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "report_record" ADD CONSTRAINT "FK_1ae8b27d53e078a11b891e04703" FOREIGN KEY ("updatedByPkid") REFERENCES "staffs"("pkid") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "report_record" DROP CONSTRAINT "FK_1ae8b27d53e078a11b891e04703"`,
    );
    await queryRunner.query(
      `ALTER TABLE "report_record" DROP CONSTRAINT "FK_0a53398175138e40d2565051c35"`,
    );
    await queryRunner.query(
      `ALTER TABLE "report_record" DROP CONSTRAINT "FK_ea20f276e8e6c851110acaa709f"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_af3acdead7887ff78890283c66"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_9bf764141c44e498a49c3512ae"`,
    );
    await queryRunner.query(
      `ALTER TABLE "template_activities" DROP CONSTRAINT "PK_9abeab7b593b4978fee25d26e2b"`,
    );
    await queryRunner.query(
      `ALTER TABLE "template_activities" ADD CONSTRAINT "PK_9bf764141c44e498a49c3512ae0" PRIMARY KEY ("template_id")`,
    );
    await queryRunner.query(
      `ALTER TABLE "template_activities" DROP COLUMN "activity_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "template_activities" ADD "activity_id" uuid NOT NULL`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_af3acdead7887ff78890283c66" ON "template_activities" ("activity_id") `,
    );
    await queryRunner.query(
      `ALTER TABLE "template_activities" DROP CONSTRAINT "PK_9bf764141c44e498a49c3512ae0"`,
    );
    await queryRunner.query(
      `ALTER TABLE "template_activities" ADD CONSTRAINT "PK_9abeab7b593b4978fee25d26e2b" PRIMARY KEY ("activity_id", "template_id")`,
    );
    await queryRunner.query(
      `ALTER TABLE "template_activities" DROP CONSTRAINT "PK_9abeab7b593b4978fee25d26e2b"`,
    );
    await queryRunner.query(
      `ALTER TABLE "template_activities" ADD CONSTRAINT "PK_af3acdead7887ff78890283c665" PRIMARY KEY ("activity_id")`,
    );
    await queryRunner.query(
      `ALTER TABLE "template_activities" DROP COLUMN "template_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "template_activities" ADD "template_id" uuid NOT NULL`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_9bf764141c44e498a49c3512ae" ON "template_activities" ("template_id") `,
    );
    await queryRunner.query(
      `ALTER TABLE "template_activities" DROP CONSTRAINT "PK_af3acdead7887ff78890283c665"`,
    );
    await queryRunner.query(
      `ALTER TABLE "template_activities" ADD CONSTRAINT "PK_9abeab7b593b4978fee25d26e2b" PRIMARY KEY ("template_id", "activity_id")`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."report_record_gradinglevel_enum_old" AS ENUM('A', 'B', 'C', 'D', 'E', 'F', 'NOT_INTRODUCED', 'INTRODUCED', 'PRACTICING', 'MASTERED')`,
    );
    await queryRunner.query(
      `ALTER TABLE "report_record" ALTER COLUMN "gradingLevel" TYPE "public"."report_record_gradinglevel_enum_old" USING "gradingLevel"::"text"::"public"."report_record_gradinglevel_enum_old"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."report_record_gradinglevel_enum"`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."report_record_gradinglevel_enum_old" RENAME TO "report_record_gradinglevel_enum"`,
    );
    await queryRunner.query(
      `ALTER TABLE "activities" DROP COLUMN "description"`,
    );
    await queryRunner.query(
      `ALTER TABLE "activities" ADD "description" character varying(100)`,
    );
    await queryRunner.query(
      `ALTER TABLE "report_record" DROP COLUMN "updatedByPkid"`,
    );
    await queryRunner.query(
      `ALTER TABLE "report_record" DROP COLUMN "studentPkid"`,
    );
    await queryRunner.query(
      `ALTER TABLE "report_record" ADD CONSTRAINT "FK_0a53398175138e40d2565051c35" FOREIGN KEY ("createdByPkid") REFERENCES "users"("pkid") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }
}

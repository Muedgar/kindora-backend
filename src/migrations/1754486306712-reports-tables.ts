import { MigrationInterface, QueryRunner } from 'typeorm';

export class Migrations1754486306712 implements MigrationInterface {
  name = 'Migrations1754486306712';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "activity_templates" ("pkid" SERIAL NOT NULL, "id" uuid NOT NULL DEFAULT uuid_generate_v4(), "version" integer NOT NULL DEFAULT '1', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "name" character varying(100) NOT NULL, "createdByPkid" integer NOT NULL, CONSTRAINT "UQ_5b97772e9a57c3c087df8bf2b70" UNIQUE ("id"), CONSTRAINT "UQ_e202aeb69061265dcc42eaf0f42" UNIQUE ("name"), CONSTRAINT "PK_bd8d38a485001605f5623c23797" PRIMARY KEY ("pkid"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "activities" ("pkid" SERIAL NOT NULL, "id" uuid NOT NULL DEFAULT uuid_generate_v4(), "version" integer NOT NULL DEFAULT '1', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "name" character varying(100) NOT NULL, "description" character varying(100), "createdByPkid" integer NOT NULL, CONSTRAINT "UQ_7f4004429f731ffb9c88eb486a8" UNIQUE ("id"), CONSTRAINT "UQ_a7455bc944cd82d40cc41e83c46" UNIQUE ("name"), CONSTRAINT "PK_ed782bd74f1717009645ccb5574" PRIMARY KEY ("pkid"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."report_record_gradingtype_enum" AS ENUM('0', '1')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."report_record_gradinglevel_enum" AS ENUM('A', 'B', 'C', 'D', 'E', 'F', 'NOT_INTRODUCED', 'INTRODUCED', 'PRACTICING', 'MASTERED')`,
    );
    await queryRunner.query(
      `CREATE TABLE "report_record" ("pkid" SERIAL NOT NULL, "id" uuid NOT NULL DEFAULT uuid_generate_v4(), "version" integer NOT NULL DEFAULT '1', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "gradingType" "public"."report_record_gradingtype_enum" NOT NULL, "gradingLevel" "public"."report_record_gradinglevel_enum" NOT NULL, "activityPkid" integer NOT NULL, "createdByPkid" integer NOT NULL, CONSTRAINT "UQ_5ad8646a3ef30a2c73b11897ded" UNIQUE ("id"), CONSTRAINT "PK_f0eb74ed62106824c1b52d038e3" PRIMARY KEY ("pkid"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "template_activities" ("template_id" uuid NOT NULL, "activity_id" uuid NOT NULL, CONSTRAINT "PK_9abeab7b593b4978fee25d26e2b" PRIMARY KEY ("template_id", "activity_id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_9bf764141c44e498a49c3512ae" ON "template_activities" ("template_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_af3acdead7887ff78890283c66" ON "template_activities" ("activity_id") `,
    );
    await queryRunner.query(
      `ALTER TABLE "activity_templates" ADD CONSTRAINT "FK_d09362c5e914509798f6e8d6747" FOREIGN KEY ("createdByPkid") REFERENCES "users"("pkid") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "activities" ADD CONSTRAINT "FK_e64ea04f596c81d5b6699e1a2ae" FOREIGN KEY ("createdByPkid") REFERENCES "users"("pkid") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "report_record" ADD CONSTRAINT "FK_0b3d305183217533386068d45eb" FOREIGN KEY ("activityPkid") REFERENCES "activities"("pkid") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "report_record" ADD CONSTRAINT "FK_0a53398175138e40d2565051c35" FOREIGN KEY ("createdByPkid") REFERENCES "users"("pkid") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "template_activities" ADD CONSTRAINT "FK_9bf764141c44e498a49c3512ae0" FOREIGN KEY ("template_id") REFERENCES "activity_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "template_activities" ADD CONSTRAINT "FK_af3acdead7887ff78890283c665" FOREIGN KEY ("activity_id") REFERENCES "activities"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "template_activities" DROP CONSTRAINT "FK_af3acdead7887ff78890283c665"`,
    );
    await queryRunner.query(
      `ALTER TABLE "template_activities" DROP CONSTRAINT "FK_9bf764141c44e498a49c3512ae0"`,
    );
    await queryRunner.query(
      `ALTER TABLE "report_record" DROP CONSTRAINT "FK_0a53398175138e40d2565051c35"`,
    );
    await queryRunner.query(
      `ALTER TABLE "report_record" DROP CONSTRAINT "FK_0b3d305183217533386068d45eb"`,
    );
    await queryRunner.query(
      `ALTER TABLE "activities" DROP CONSTRAINT "FK_e64ea04f596c81d5b6699e1a2ae"`,
    );
    await queryRunner.query(
      `ALTER TABLE "activity_templates" DROP CONSTRAINT "FK_d09362c5e914509798f6e8d6747"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_af3acdead7887ff78890283c66"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_9bf764141c44e498a49c3512ae"`,
    );
    await queryRunner.query(`DROP TABLE "template_activities"`);
    await queryRunner.query(`DROP TABLE "report_record"`);
    await queryRunner.query(
      `DROP TYPE "public"."report_record_gradinglevel_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."report_record_gradingtype_enum"`,
    );
    await queryRunner.query(`DROP TABLE "activities"`);
    await queryRunner.query(`DROP TABLE "activity_templates"`);
  }
}

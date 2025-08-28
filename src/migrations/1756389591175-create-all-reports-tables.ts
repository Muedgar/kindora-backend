import { MigrationInterface, QueryRunner } from 'typeorm';

export class AllReportsTables1756389591175 implements MigrationInterface {
  name = 'AllReportsTables1756389591175';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "grading_level" ("pkid" SERIAL NOT NULL, "id" uuid NOT NULL DEFAULT uuid_generate_v4(), "version" integer NOT NULL DEFAULT '1', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "name" character varying(100) NOT NULL, "createdByPkid" integer NOT NULL, CONSTRAINT "UQ_8ae680943f6f43bba175449f267" UNIQUE ("id"), CONSTRAINT "UQ_ed202331ad34ee1f69b1c466173" UNIQUE ("name"), CONSTRAINT "PK_dfe07b30ea3c3a1964b168bdce5" PRIMARY KEY ("pkid"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "daily_report" ("pkid" SERIAL NOT NULL, "id" uuid NOT NULL DEFAULT uuid_generate_v4(), "version" integer NOT NULL DEFAULT '1', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "date" date NOT NULL, "comments" character varying(500), "activityPkid" integer NOT NULL, "gradingLevelPkid" integer NOT NULL, "studentPkid" integer NOT NULL, "createdByPkid" integer NOT NULL, "updatedByPkid" integer, CONSTRAINT "UQ_6f51b9eb292151755dc3ade12b1" UNIQUE ("id"), CONSTRAINT "UQ_d177522a293fe486065ec7a7172" UNIQUE ("studentPkid", "activityPkid", "gradingLevelPkid", "date"), CONSTRAINT "PK_d2ec94dc0fd6934c0115861b40d" PRIMARY KEY ("pkid"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "activity_grading_levels" ("activity_id" uuid NOT NULL, "grading_level_id" uuid NOT NULL, CONSTRAINT "PK_0a193468c983ad8013bad1bad3f" PRIMARY KEY ("activity_id", "grading_level_id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_cb83f0c9c5c1957115d54c5c47" ON "activity_grading_levels" ("activity_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_7fbd0d57f212ab8807f61b9899" ON "activity_grading_levels" ("grading_level_id") `,
    );
    await queryRunner.query(
      `ALTER TABLE "permissions" ALTER COLUMN "id" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "permissions" ALTER COLUMN "id" SET DEFAULT uuid_generate_v4()`,
    );
    await queryRunner.query(
      `ALTER TABLE "roles" ALTER COLUMN "id" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "roles" ALTER COLUMN "id" SET DEFAULT uuid_generate_v4()`,
    );
    await queryRunner.query(
      `ALTER TABLE "schools" ALTER COLUMN "id" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "schools" ALTER COLUMN "id" SET DEFAULT uuid_generate_v4()`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ALTER COLUMN "id" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ALTER COLUMN "id" SET DEFAULT uuid_generate_v4()`,
    );
    await queryRunner.query(
      `ALTER TABLE "staffs" ALTER COLUMN "id" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "staffs" ALTER COLUMN "id" SET DEFAULT uuid_generate_v4()`,
    );
    await queryRunner.query(
      `ALTER TABLE "parents" ALTER COLUMN "id" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "parents" ALTER COLUMN "id" SET DEFAULT uuid_generate_v4()`,
    );
    await queryRunner.query(
      `ALTER TABLE "classrooms" ALTER COLUMN "id" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "classrooms" ALTER COLUMN "id" SET DEFAULT uuid_generate_v4()`,
    );
    await queryRunner.query(
      `ALTER TABLE "students" ALTER COLUMN "id" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "students" ALTER COLUMN "id" SET DEFAULT uuid_generate_v4()`,
    );
    await queryRunner.query(
      `ALTER TABLE "activity_templates" ALTER COLUMN "id" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "activity_templates" ALTER COLUMN "id" SET DEFAULT uuid_generate_v4()`,
    );
    await queryRunner.query(
      `ALTER TABLE "activities" ALTER COLUMN "id" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "activities" ALTER COLUMN "id" SET DEFAULT uuid_generate_v4()`,
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
      `ALTER TABLE "template_activities" ADD "template_id" uuid NOT NULL`,
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
      `ALTER TABLE "template_activities" ADD "activity_id" uuid NOT NULL`,
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
      `ALTER TABLE "grading_level" ADD CONSTRAINT "FK_473f564c2b065fd6d3476128a8a" FOREIGN KEY ("createdByPkid") REFERENCES "users"("pkid") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "daily_report" ADD CONSTRAINT "FK_e7f7193cd7d5a0f513ba8870d89" FOREIGN KEY ("activityPkid") REFERENCES "activities"("pkid") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "daily_report" ADD CONSTRAINT "FK_2a9e875651eb561684143c442b3" FOREIGN KEY ("gradingLevelPkid") REFERENCES "grading_level"("pkid") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "daily_report" ADD CONSTRAINT "FK_87412dfdb48025d3058caf70524" FOREIGN KEY ("studentPkid") REFERENCES "students"("pkid") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "daily_report" ADD CONSTRAINT "FK_fee6dfdc6c251f264858cc0ae74" FOREIGN KEY ("createdByPkid") REFERENCES "staffs"("pkid") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "daily_report" ADD CONSTRAINT "FK_9ec3a61848a6dfa1f34b1c0a02b" FOREIGN KEY ("updatedByPkid") REFERENCES "staffs"("pkid") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "template_activities" ADD CONSTRAINT "FK_9bf764141c44e498a49c3512ae0" FOREIGN KEY ("template_id") REFERENCES "activity_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "template_activities" ADD CONSTRAINT "FK_af3acdead7887ff78890283c665" FOREIGN KEY ("activity_id") REFERENCES "activities"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "activity_grading_levels" ADD CONSTRAINT "FK_cb83f0c9c5c1957115d54c5c474" FOREIGN KEY ("activity_id") REFERENCES "activities"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "activity_grading_levels" ADD CONSTRAINT "FK_7fbd0d57f212ab8807f61b98999" FOREIGN KEY ("grading_level_id") REFERENCES "grading_level"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "activity_grading_levels" DROP CONSTRAINT "FK_7fbd0d57f212ab8807f61b98999"`,
    );
    await queryRunner.query(
      `ALTER TABLE "activity_grading_levels" DROP CONSTRAINT "FK_cb83f0c9c5c1957115d54c5c474"`,
    );
    await queryRunner.query(
      `ALTER TABLE "template_activities" DROP CONSTRAINT "FK_af3acdead7887ff78890283c665"`,
    );
    await queryRunner.query(
      `ALTER TABLE "template_activities" DROP CONSTRAINT "FK_9bf764141c44e498a49c3512ae0"`,
    );
    await queryRunner.query(
      `ALTER TABLE "daily_report" DROP CONSTRAINT "FK_9ec3a61848a6dfa1f34b1c0a02b"`,
    );
    await queryRunner.query(
      `ALTER TABLE "daily_report" DROP CONSTRAINT "FK_fee6dfdc6c251f264858cc0ae74"`,
    );
    await queryRunner.query(
      `ALTER TABLE "daily_report" DROP CONSTRAINT "FK_87412dfdb48025d3058caf70524"`,
    );
    await queryRunner.query(
      `ALTER TABLE "daily_report" DROP CONSTRAINT "FK_2a9e875651eb561684143c442b3"`,
    );
    await queryRunner.query(
      `ALTER TABLE "daily_report" DROP CONSTRAINT "FK_e7f7193cd7d5a0f513ba8870d89"`,
    );
    await queryRunner.query(
      `ALTER TABLE "grading_level" DROP CONSTRAINT "FK_473f564c2b065fd6d3476128a8a"`,
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
      `ALTER TABLE "template_activities" ADD "activity_id" character varying NOT NULL`,
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
      `ALTER TABLE "template_activities" ADD "template_id" character varying NOT NULL`,
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
      `ALTER TABLE "activities" ALTER COLUMN "id" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "activities" ALTER COLUMN "id" SET DEFAULT uuid_generate_v4()`,
    );
    await queryRunner.query(
      `ALTER TABLE "activity_templates" ALTER COLUMN "id" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "activity_templates" ALTER COLUMN "id" SET DEFAULT uuid_generate_v4()`,
    );
    await queryRunner.query(
      `ALTER TABLE "students" ALTER COLUMN "id" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "students" ALTER COLUMN "id" SET DEFAULT uuid_generate_v4()`,
    );
    await queryRunner.query(
      `ALTER TABLE "classrooms" ALTER COLUMN "id" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "classrooms" ALTER COLUMN "id" SET DEFAULT uuid_generate_v4()`,
    );
    await queryRunner.query(
      `ALTER TABLE "parents" ALTER COLUMN "id" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "parents" ALTER COLUMN "id" SET DEFAULT uuid_generate_v4()`,
    );
    await queryRunner.query(
      `ALTER TABLE "staffs" ALTER COLUMN "id" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "staffs" ALTER COLUMN "id" SET DEFAULT uuid_generate_v4()`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ALTER COLUMN "id" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ALTER COLUMN "id" SET DEFAULT uuid_generate_v4()`,
    );
    await queryRunner.query(
      `ALTER TABLE "schools" ALTER COLUMN "id" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "schools" ALTER COLUMN "id" SET DEFAULT uuid_generate_v4()`,
    );
    await queryRunner.query(
      `ALTER TABLE "roles" ALTER COLUMN "id" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "roles" ALTER COLUMN "id" SET DEFAULT uuid_generate_v4()`,
    );
    await queryRunner.query(
      `ALTER TABLE "permissions" ALTER COLUMN "id" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "permissions" ALTER COLUMN "id" SET DEFAULT uuid_generate_v4()`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_7fbd0d57f212ab8807f61b9899"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_cb83f0c9c5c1957115d54c5c47"`,
    );
    await queryRunner.query(`DROP TABLE "activity_grading_levels"`);
    await queryRunner.query(`DROP TABLE "daily_report"`);
    await queryRunner.query(`DROP TABLE "grading_level"`);
  }
}

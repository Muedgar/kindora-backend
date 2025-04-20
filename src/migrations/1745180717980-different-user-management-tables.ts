import { MigrationInterface, QueryRunner } from 'typeorm';

export class DifferentUserManagementTables1745180717980
  implements MigrationInterface
{
  name = 'DifferentUserManagementTables1745180717980';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "schools" ("pkid" SERIAL NOT NULL, "id" uuid NOT NULL DEFAULT uuid_generate_v4(), "version" integer NOT NULL DEFAULT '1', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "name" character varying(200) NOT NULL, "address" character varying(200) NOT NULL, "city" character varying(200) NOT NULL, "country" character varying(200) NOT NULL, "phoneNumber" character varying(200) NOT NULL, "enrollmentCapacity" character varying(200) NOT NULL, "createdByPkid" integer NOT NULL, CONSTRAINT "UQ_95b932e47ac129dd8e23a0db548" UNIQUE ("id"), CONSTRAINT "REL_cf1a824a7803c041af53b8220f" UNIQUE ("createdByPkid"), CONSTRAINT "PK_0db1bafe1bd5bf4772b88599ef9" PRIMARY KEY ("pkid"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "users" ("pkid" SERIAL NOT NULL, "id" uuid NOT NULL DEFAULT uuid_generate_v4(), "version" integer NOT NULL DEFAULT '1', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "userName" character varying(200) NOT NULL, "email" character varying(100) NOT NULL, "password" character varying(250) NOT NULL, "userType" character varying(50) NOT NULL, "status" boolean NOT NULL DEFAULT true, "isDefaultPassword" boolean NOT NULL DEFAULT true, "twoFactorAuthentication" boolean NOT NULL DEFAULT false, "emailVerified" boolean NOT NULL DEFAULT true, "emailVerificationKey" character varying(250), "emailVerificationExpiry" TIMESTAMP WITH TIME ZONE, "rolePkid" integer, "schoolPkid" integer, CONSTRAINT "UQ_a3ffb1c0c8416b9fc6f907b7433" UNIQUE ("id"), CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE ("email"), CONSTRAINT "PK_19ad66d3f7250b74880458f4eb9" PRIMARY KEY ("pkid"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "staffs" ("pkid" SERIAL NOT NULL, "id" uuid NOT NULL DEFAULT uuid_generate_v4(), "version" integer NOT NULL DEFAULT '1', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "position" character varying(100), "userPkid" integer NOT NULL, CONSTRAINT "UQ_f3fec5e06209b46afdf8accf117" UNIQUE ("id"), CONSTRAINT "REL_43448c6f51a6f7d369234ff91d" UNIQUE ("userPkid"), CONSTRAINT "PK_d4b37beef173233893fa76ad194" PRIMARY KEY ("pkid"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "parents" ("pkid" SERIAL NOT NULL, "id" uuid NOT NULL DEFAULT uuid_generate_v4(), "version" integer NOT NULL DEFAULT '1', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "occupation" character varying(100), "phoneNumber" character varying(15), "address" text, "userPkid" integer NOT NULL, CONSTRAINT "UQ_9a4dc67c7b8e6a9cb918938d353" UNIQUE ("id"), CONSTRAINT "REL_d33ff7aebe329e9c2765482e38" UNIQUE ("userPkid"), CONSTRAINT "PK_afe39e2e751469e6199ca5cf3b3" PRIMARY KEY ("pkid"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "classrooms" ("pkid" SERIAL NOT NULL, "id" uuid NOT NULL DEFAULT uuid_generate_v4(), "version" integer NOT NULL DEFAULT '1', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "name" character varying(100) NOT NULL, "ageGroup" character varying(50), "capacity" integer, "createdByPkid" integer NOT NULL, CONSTRAINT "UQ_20b7b82896c06eda27548bd0c24" UNIQUE ("id"), CONSTRAINT "PK_dc14ce1bc13c5c56997514e784c" PRIMARY KEY ("pkid"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "students" ("pkid" SERIAL NOT NULL, "id" uuid NOT NULL DEFAULT uuid_generate_v4(), "version" integer NOT NULL DEFAULT '1', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "fullName" character varying(100) NOT NULL, "dateOfBirth" date, "gender" character varying(20), "notes" text, "parentPkid" integer, "classroomPkid" integer, CONSTRAINT "UQ_7d7f07271ad4ce999880713f05e" UNIQUE ("id"), CONSTRAINT "PK_bdf6c6c7be95c174bab13d88ce7" PRIMARY KEY ("pkid"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "classrooms_students_students" ("classroomsPkid" integer NOT NULL, "studentsPkid" integer NOT NULL, CONSTRAINT "PK_b74fbd70c86e13f712f3f389346" PRIMARY KEY ("classroomsPkid", "studentsPkid"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_f689b6b7165407071b0af243f3" ON "classrooms_students_students" ("classroomsPkid") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_6ea2856364fa6c2b0f15870000" ON "classrooms_students_students" ("studentsPkid") `,
    );
    await queryRunner.query(
      `ALTER TABLE "schools" ADD CONSTRAINT "FK_cf1a824a7803c041af53b8220f1" FOREIGN KEY ("createdByPkid") REFERENCES "users"("pkid") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD CONSTRAINT "FK_7152f1f7b25884597d1e49b18f8" FOREIGN KEY ("rolePkid") REFERENCES "roles"("pkid") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD CONSTRAINT "FK_b2f8ba59264d5f5d790e9db911a" FOREIGN KEY ("schoolPkid") REFERENCES "schools"("pkid") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "staffs" ADD CONSTRAINT "FK_43448c6f51a6f7d369234ff91d9" FOREIGN KEY ("userPkid") REFERENCES "users"("pkid") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "parents" ADD CONSTRAINT "FK_d33ff7aebe329e9c2765482e385" FOREIGN KEY ("userPkid") REFERENCES "users"("pkid") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "classrooms" ADD CONSTRAINT "FK_5886a28722e0d2697d6138e61fd" FOREIGN KEY ("createdByPkid") REFERENCES "users"("pkid") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "students" ADD CONSTRAINT "FK_5f43e2f5f63a1f96d05c5e9ddf6" FOREIGN KEY ("parentPkid") REFERENCES "parents"("pkid") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "students" ADD CONSTRAINT "FK_6ea66e12dd468b414f29b01ff08" FOREIGN KEY ("classroomPkid") REFERENCES "classrooms"("pkid") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "classrooms_students_students" ADD CONSTRAINT "FK_f689b6b7165407071b0af243f3b" FOREIGN KEY ("classroomsPkid") REFERENCES "classrooms"("pkid") ON DELETE CASCADE ON UPDATE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "classrooms_students_students" ADD CONSTRAINT "FK_6ea2856364fa6c2b0f15870000d" FOREIGN KEY ("studentsPkid") REFERENCES "students"("pkid") ON DELETE CASCADE ON UPDATE CASCADE`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "classrooms_students_students" DROP CONSTRAINT "FK_6ea2856364fa6c2b0f15870000d"`,
    );
    await queryRunner.query(
      `ALTER TABLE "classrooms_students_students" DROP CONSTRAINT "FK_f689b6b7165407071b0af243f3b"`,
    );
    await queryRunner.query(
      `ALTER TABLE "students" DROP CONSTRAINT "FK_6ea66e12dd468b414f29b01ff08"`,
    );
    await queryRunner.query(
      `ALTER TABLE "students" DROP CONSTRAINT "FK_5f43e2f5f63a1f96d05c5e9ddf6"`,
    );
    await queryRunner.query(
      `ALTER TABLE "classrooms" DROP CONSTRAINT "FK_5886a28722e0d2697d6138e61fd"`,
    );
    await queryRunner.query(
      `ALTER TABLE "parents" DROP CONSTRAINT "FK_d33ff7aebe329e9c2765482e385"`,
    );
    await queryRunner.query(
      `ALTER TABLE "staffs" DROP CONSTRAINT "FK_43448c6f51a6f7d369234ff91d9"`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" DROP CONSTRAINT "FK_b2f8ba59264d5f5d790e9db911a"`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" DROP CONSTRAINT "FK_7152f1f7b25884597d1e49b18f8"`,
    );
    await queryRunner.query(
      `ALTER TABLE "schools" DROP CONSTRAINT "FK_cf1a824a7803c041af53b8220f1"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_6ea2856364fa6c2b0f15870000"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_f689b6b7165407071b0af243f3"`,
    );
    await queryRunner.query(`DROP TABLE "classrooms_students_students"`);
    await queryRunner.query(`DROP TABLE "students"`);
    await queryRunner.query(`DROP TABLE "classrooms"`);
    await queryRunner.query(`DROP TABLE "parents"`);
    await queryRunner.query(`DROP TABLE "staffs"`);
    await queryRunner.query(`DROP TABLE "users"`);
    await queryRunner.query(`DROP TABLE "schools"`);
  }
}

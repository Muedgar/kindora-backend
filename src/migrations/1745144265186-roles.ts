import { MigrationInterface, QueryRunner } from 'typeorm';

export class Roles1745144265186 implements MigrationInterface {
  name = 'Roles1745144265186';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "roles" ("pkid" SERIAL NOT NULL, "id" uuid NOT NULL DEFAULT uuid_generate_v4(), "version" integer NOT NULL DEFAULT '1', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "name" character varying(100) NOT NULL, "slug" character varying(100) NOT NULL, "status" boolean NOT NULL DEFAULT true, CONSTRAINT "UQ_c1433d71a4838793a49dcad46ab" UNIQUE ("id"), CONSTRAINT "UQ_648e3f5447f725579d7d4ffdfb7" UNIQUE ("name"), CONSTRAINT "UQ_881f72bac969d9a00a1a29e1079" UNIQUE ("slug"), CONSTRAINT "PK_618a115d0bd8d25941e84c51904" PRIMARY KEY ("pkid"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "role_permissions" ("rolesPkid" integer NOT NULL, "permissionsPkid" integer NOT NULL, CONSTRAINT "PK_cee9abf6fddabbb268e1a53751c" PRIMARY KEY ("rolesPkid", "permissionsPkid"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_b55ad12dee7e2f66afbe273247" ON "role_permissions" ("rolesPkid") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_707f7439fbb135f9763ca90b49" ON "role_permissions" ("permissionsPkid") `,
    );
    await queryRunner.query(
      `ALTER TABLE "role_permissions" ADD CONSTRAINT "FK_b55ad12dee7e2f66afbe2732473" FOREIGN KEY ("rolesPkid") REFERENCES "roles"("pkid") ON DELETE CASCADE ON UPDATE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "role_permissions" ADD CONSTRAINT "FK_707f7439fbb135f9763ca90b49f" FOREIGN KEY ("permissionsPkid") REFERENCES "permissions"("pkid") ON DELETE CASCADE ON UPDATE CASCADE`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "role_permissions" DROP CONSTRAINT "FK_707f7439fbb135f9763ca90b49f"`,
    );
    await queryRunner.query(
      `ALTER TABLE "role_permissions" DROP CONSTRAINT "FK_b55ad12dee7e2f66afbe2732473"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_707f7439fbb135f9763ca90b49"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_b55ad12dee7e2f66afbe273247"`,
    );
    await queryRunner.query(`DROP TABLE "role_permissions"`);
    await queryRunner.query(`DROP TABLE "roles"`);
  }
}

import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateRwandaLocationTables1772208000000
  implements MigrationInterface
{
  name = 'CreateRwandaLocationTables1772208000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "provinces" (
        "pkid" SERIAL NOT NULL,
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "version" integer NOT NULL DEFAULT '1',
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        "name" character varying(100) NOT NULL,
        CONSTRAINT "PK_9612f3f1add5f8db17f76f77814" PRIMARY KEY ("pkid"),
        CONSTRAINT "UQ_045f7c3ac5f12f4f8885626d45c" UNIQUE ("id"),
        CONSTRAINT "UQ_9b4f92914b2f1556fef522f2e43" UNIQUE ("name")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "districts" (
        "pkid" SERIAL NOT NULL,
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "version" integer NOT NULL DEFAULT '1',
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        "name" character varying(100) NOT NULL,
        "provincePkid" integer,
        CONSTRAINT "PK_2458d49f6f27aa8caedd57cd706" PRIMARY KEY ("pkid"),
        CONSTRAINT "UQ_6d0a74da4ff7f95fd7862d06ea4" UNIQUE ("id"),
        CONSTRAINT "UQ_f0d2f167bbd56f62eaf20fba7f8" UNIQUE ("name")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "sectors" (
        "pkid" SERIAL NOT NULL,
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "version" integer NOT NULL DEFAULT '1',
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        "name" character varying(100) NOT NULL,
        "districtPkid" integer,
        CONSTRAINT "PK_c3c8f453ca74b6947b2a276f218" PRIMARY KEY ("pkid"),
        CONSTRAINT "UQ_d20eb8e084d84451980e1ca0747" UNIQUE ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "cells" (
        "pkid" SERIAL NOT NULL,
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "version" integer NOT NULL DEFAULT '1',
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        "name" character varying(100) NOT NULL,
        "sectorPkid" integer,
        CONSTRAINT "PK_9f2118f8ad20dc88e8958aa4de6" PRIMARY KEY ("pkid"),
        CONSTRAINT "UQ_dd5df8d2db855cc43f811ad64b6" UNIQUE ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "villages" (
        "pkid" SERIAL NOT NULL,
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "version" integer NOT NULL DEFAULT '1',
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        "name" character varying(100) NOT NULL,
        "cellPkid" integer,
        CONSTRAINT "PK_dfb4ee62549677ec0f61f4f16bc" PRIMARY KEY ("pkid"),
        CONSTRAINT "UQ_8233b650f3ef9f44fede86f9bb7" UNIQUE ("id")
      )
    `);

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_3555b3716dcbf6636f59fdf4f8" ON "cells" ("sectorPkid")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_8c57e7f4e9f0b06fdf588f9a2e" ON "villages" ("cellPkid")`,
    );

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'FK_1d89f5614419f4d8cd2848c4432'
        ) THEN
          ALTER TABLE "districts"
          ADD CONSTRAINT "FK_1d89f5614419f4d8cd2848c4432"
          FOREIGN KEY ("provincePkid") REFERENCES "provinces"("pkid")
          ON DELETE NO ACTION ON UPDATE NO ACTION;
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'FK_6f12802d5f8ab4b95c4f4e022f7'
        ) THEN
          ALTER TABLE "sectors"
          ADD CONSTRAINT "FK_6f12802d5f8ab4b95c4f4e022f7"
          FOREIGN KEY ("districtPkid") REFERENCES "districts"("pkid")
          ON DELETE NO ACTION ON UPDATE NO ACTION;
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'FK_535e6ad4f24c4f88f0ea3e6de2d'
        ) THEN
          ALTER TABLE "cells"
          ADD CONSTRAINT "FK_535e6ad4f24c4f88f0ea3e6de2d"
          FOREIGN KEY ("sectorPkid") REFERENCES "sectors"("pkid")
          ON DELETE NO ACTION ON UPDATE NO ACTION;
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'FK_8adef21f8eb83c005f6f92f8f1a'
        ) THEN
          ALTER TABLE "villages"
          ADD CONSTRAINT "FK_8adef21f8eb83c005f6f92f8f1a"
          FOREIGN KEY ("cellPkid") REFERENCES "cells"("pkid")
          ON DELETE NO ACTION ON UPDATE NO ACTION;
        END IF;
      END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "villages" DROP CONSTRAINT IF EXISTS "FK_8adef21f8eb83c005f6f92f8f1a"`,
    );
    await queryRunner.query(
      `ALTER TABLE "cells" DROP CONSTRAINT IF EXISTS "FK_535e6ad4f24c4f88f0ea3e6de2d"`,
    );
    await queryRunner.query(
      `ALTER TABLE "sectors" DROP CONSTRAINT IF EXISTS "FK_6f12802d5f8ab4b95c4f4e022f7"`,
    );
    await queryRunner.query(
      `ALTER TABLE "districts" DROP CONSTRAINT IF EXISTS "FK_1d89f5614419f4d8cd2848c4432"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."IDX_8c57e7f4e9f0b06fdf588f9a2e"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."IDX_3555b3716dcbf6636f59fdf4f8"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "villages"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "cells"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "sectors"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "districts"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "provinces"`);
  }
}

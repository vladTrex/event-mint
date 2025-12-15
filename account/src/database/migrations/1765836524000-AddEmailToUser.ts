import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddEmailToUser1765836524000 implements MigrationInterface {
  name = 'AddEmailToUser1765836524000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "user" ADD "email" character varying NOT NULL`,
    );
    await queryRunner.query(
      `COMMENT ON COLUMN "user"."email" IS 'User e-mail address'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "email"`);
  }
}

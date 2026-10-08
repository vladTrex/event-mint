import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUniqueEmailToUser1767000000000 implements MigrationInterface {
  name = 'AddUniqueEmailToUser1767000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "user" ADD CONSTRAINT "UQ_user_email" UNIQUE ("email")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "user" DROP CONSTRAINT "UQ_user_email"`,
    );
  }
}

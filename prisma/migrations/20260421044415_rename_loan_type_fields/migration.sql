/*
  Warnings:

  - You are about to drop the column `loanTypeOther` on the `leads` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `leads` DROP COLUMN `loanTypeOther`,
    ADD COLUMN `customLoanType` TEXT NULL,
    ADD COLUMN `loanType` VARCHAR(191) NULL DEFAULT 'Other',
    MODIFY `serialId` INTEGER NULL AUTO_INCREMENT;

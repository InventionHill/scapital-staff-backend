-- AlterTable
ALTER TABLE `application_forms` ADD COLUMN `fileNumber` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `leads` MODIFY `serialId` INTEGER NULL AUTO_INCREMENT;

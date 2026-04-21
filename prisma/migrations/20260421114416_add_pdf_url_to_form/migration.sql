-- AlterTable
ALTER TABLE `application_forms` ADD COLUMN `pdfUrl` TEXT NULL;

-- AlterTable
ALTER TABLE `leads` MODIFY `serialId` INTEGER NULL AUTO_INCREMENT;

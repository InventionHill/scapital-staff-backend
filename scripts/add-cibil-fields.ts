/* eslint-disable no-console */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Adding CIBIL columns to "leads" table...');
  try {
    await prisma.$executeRawUnsafe(
      'ALTER TABLE leads ADD COLUMN cibilStatus VARCHAR(50) NULL, ADD COLUMN cibilRemark TEXT NULL;',
    );
    console.log('Successfully added CIBIL columns.');
  } catch (error) {
    if (error.message.includes('Duplicate column name')) {
      console.log('CIBIL columns already exist.');
    } else {
      console.error('Error adding CIBIL columns:', error);
      process.exit(1);
    }
  } finally {
    await prisma.$disconnect();
  }
}

main();

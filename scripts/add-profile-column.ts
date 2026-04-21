/* eslint-disable no-console */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Adding "profile" column to "leads" table...');
  try {
    await prisma.$executeRawUnsafe(
      'ALTER TABLE leads ADD COLUMN profile VARCHAR(50) NULL;',
    );
    console.log('Successfully added "profile" column.');
  } catch (error) {
    if (error.message.includes('Duplicate column name')) {
      console.log('Column "profile" already exists.');
    } else {
      console.error('Error adding "profile" column:', error);
      process.exit(1);
    }
  } finally {
    await prisma.$disconnect();
  }
}

main();

/* eslint-disable no-console */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🏁 Starting missing columns check for "leads" table...');

  try {
    // 1. Add statusRemark if missing
    try {
      await prisma.$executeRawUnsafe(
        'ALTER TABLE leads ADD COLUMN statusRemark TEXT NULL;',
      );
      console.log('✅ Added statusRemark column.');
    } catch (e) {
      if (e.message.includes('Duplicate column name')) {
        console.log('ℹ️  statusRemark already exists.');
      } else {
        throw e;
      }
    }

    // 2. Add profile if missing
    try {
      await prisma.$executeRawUnsafe(
        'ALTER TABLE leads ADD COLUMN profile VARCHAR(50) NULL;',
      );
      console.log('✅ Added profile column.');
    } catch (e) {
      if (e.message.includes('Duplicate column name')) {
        console.log('ℹ️  profile already exists.');
      } else {
        throw e;
      }
    }

    // 3. Add CIBIL fields if missing
    try {
      await prisma.$executeRawUnsafe(
        'ALTER TABLE leads ADD COLUMN cibilStatus VARCHAR(50) NULL, ADD COLUMN cibilRemark TEXT NULL;',
      );
      console.log('✅ Added CIBIL columns.');
    } catch (e) {
      if (e.message.includes('Duplicate column name')) {
        console.log('ℹ️  CIBIL columns already exist.');
      } else {
        throw e;
      }
    }

    console.log('✨ Database is now in sync with the current schema!');
  } catch (error) {
    console.error('❌ Error during column check:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();

/* eslint-disable no-console */
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // 1. Seed Branches
  await prisma.branch.upsert({
    where: { name: 'Scapital' },
    update: {},
    create: { name: 'Scapital', location: 'Main Office' },
  });

  await prisma.branch.upsert({
    where: { name: 'MoneyLoan' },
    update: {},
    create: { name: 'MoneyLoan', location: 'Branch Office' },
  });

  // 2. Seed Super Admin
  const rootEmail = process.env.SUPER_ADMIN_EMAIL;
  const rootPassword = process.env.SUPER_ADMIN_PASSWORD;

  if (!rootEmail || !rootPassword) {
    console.warn(
      'WARNING: SUPER_ADMIN_EMAIL or SUPER_ADMIN_PASSWORD not set. Skipping Super Admin creation.',
    );
  } else {
    const rootHashedPassword = await bcrypt.hash(rootPassword, 10);
    await prisma.superAdmin.upsert({
      where: { email: rootEmail },
      update: {},
      create: {
        email: rootEmail,
        password: rootHashedPassword,
        name: 'Super Admin',
      },
    });
    console.log(`Initial Super Admin seeded with email: ${rootEmail}`);
  }

  console.log('Branches seeded successfully.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

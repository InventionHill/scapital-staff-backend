/* eslint-disable no-console */
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log('--- LOAN TYPE ISOLATION TEST ---');

  const adminAId = 'admin-a-id';
  const adminBId = 'admin-b-id';

  // 1. Create Loan Type for Admin A
  const ltA = await prisma.loanType.create({
    data: { name: 'Type A', createdBy: adminAId },
  });
  console.log('Created Type A for Admin A');

  // 2. Create Loan Type for Admin B
  const ltB = await prisma.loanType.create({
    data: { name: 'Type B', createdBy: adminBId },
  });
  console.log('Created Type B for Admin B');

  // 3. Find All for Admin A
  const allA = await prisma.loanType.findMany({
    where: { createdBy: adminAId },
  });
  console.log(
    'Admin A sees:',
    allA.map((t) => t.name),
  );

  // 4. Find All for Admin B
  const allB = await prisma.loanType.findMany({
    where: { createdBy: adminBId },
  });
  console.log(
    'Admin B sees:',
    allB.map((t) => t.name),
  );

  // Cleanup
  await prisma.loanType.delete({ where: { id: ltA.id } });
  await prisma.loanType.delete({ where: { id: ltB.id } });
  console.log('--- TEST COMPLETE ---');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

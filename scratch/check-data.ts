/* eslint-disable no-console */
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const admins = await prisma.adminUser.findMany({
    select: { id: true, email: true, mobileIds: true },
  });
  console.log('Admins:', JSON.stringify(admins, null, 2));

  const loanTypes = await prisma.loanType.findMany();
  console.log('LoanTypes:', JSON.stringify(loanTypes, null, 2));
}
main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

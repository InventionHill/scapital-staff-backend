/* eslint-disable no-console */
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const admins = await prisma.adminUser.findMany({
    select: { id: true, email: true, role: true },
  });
  console.log('Admins:', JSON.stringify(admins, null, 2));
}
main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

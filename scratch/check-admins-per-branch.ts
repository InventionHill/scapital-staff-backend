/* eslint-disable no-console */
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const branches = await prisma.branch.findMany({
    include: { _count: { select: { admins: true } } },
  });
  console.log(JSON.stringify(branches, null, 2));
}
main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

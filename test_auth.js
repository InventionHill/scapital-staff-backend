const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const admins = await prisma.admin.findMany();
  console.log("Admins:", admins.map(a => a.id));

  const adminCallLogs = await prisma.callLog.findMany({ where: { adminId: { not: null } } });
  console.log("Admin call logs count:", adminCallLogs.length);
}
main().finally(() => prisma.$disconnect());

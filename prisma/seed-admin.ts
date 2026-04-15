import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const hashedPassword = await bcrypt.hash('admin123', 10);
  
  // Seed Admin
  const admin = await prisma.adminUser.upsert({
    where: { email: 'admin@scapital.com' },
    update: {},
    create: {
      email: 'admin@scapital.com',
      password: hashedPassword,
      name: 'Admin',
      role: 'ADMIN'
    }
  });
  console.log('Admin user seeded: admin@scapital.com / admin123');
}

main().catch(e => { console.error(e); process.exit(1); }).finally(async () => { await prisma.$disconnect(); });
